using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using DomainOrder = TicketStar.Domain.Entities.Order;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Events;
using TicketStar.Application.DTOs.Orders;
using TicketStar.Application.DTOs.Qr;
using TicketStar.Application.DTOs.SePay;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Application.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepo;
    private readonly ITicketRepository _ticketRepo;
    private readonly ITicketTypeRepository _ticketTypeRepo;
    private readonly IEventRepository _eventRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDistributedLock _distributedLock;
    private readonly IQrCodeService _qrCodeService;
    private readonly IPaymentRepository _paymentRepo;
    private readonly ISePayWebhookHandler _sePayHandler;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrderRepository orderRepo,
        ITicketRepository ticketRepo,
        ITicketTypeRepository ticketTypeRepo,
        IEventRepository eventRepo,
        IPaymentRepository paymentRepo,
        IUnitOfWork unitOfWork,
        IDistributedLock distributedLock,
        IQrCodeService qrCodeService,
        ISePayWebhookHandler sePayHandler,
        IConnectionMultiplexer redis,
        ILogger<OrderService> logger)
    {
        _orderRepo = orderRepo;
        _ticketRepo = ticketRepo;
        _ticketTypeRepo = ticketTypeRepo;
        _eventRepo = eventRepo;
        _paymentRepo = paymentRepo;
        _unitOfWork = unitOfWork;
        _distributedLock = distributedLock;
        _qrCodeService = qrCodeService;
        _sePayHandler = sePayHandler;
        _redis = redis;
        _logger = logger;
    }

    public async Task<Result<OrderResponse>> CreateOrderAsync(string userId, CreateOrderRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(request.EventId, ct);
        if (eventEntity == null)
            return Result<OrderResponse>.Failure("Event not found", ResultError.NotFound);

        var orderItems = new List<OrderItem>();
        decimal totalAmount = 0;

        foreach (var item in request.Items)
        {
            var ticketType = await _ticketTypeRepo.GetByIdAsync(item.TicketTypeId, ct);
            if (ticketType == null || ticketType.EventId != request.EventId)
                return Result<OrderResponse>.Failure($"Ticket type {item.TicketTypeId} not found", ResultError.NotFound);

            if (!await _ticketTypeRepo.IsAvailableAsync(item.TicketTypeId, item.Quantity, ct))
                return Result<OrderResponse>.Failure($"Not enough tickets for {ticketType.Name}", ResultError.Conflict);

            var lockKey = $"ticket-quota-{item.TicketTypeId}";
            await using var lockHandle = await _distributedLock.AcquireAsync(lockKey, TimeSpan.FromSeconds(30), ct);

            if (lockHandle == null)
                return Result<OrderResponse>.Failure("Could not acquire ticket lock. Please try again.", ResultError.Conflict);

            if (!await _ticketTypeRepo.IsAvailableAsync(item.TicketTypeId, item.Quantity, ct))
                return Result<OrderResponse>.Failure($"Tickets sold out for {ticketType.Name}", ResultError.Conflict);

            var subtotal = ticketType.Price * item.Quantity;
            totalAmount += subtotal;

            orderItems.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                TicketTypeId = item.TicketTypeId,
                Quantity = item.Quantity,
                UnitPrice = ticketType.Price
            });
        }

        try
        {
            var order = new DomainOrder
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Status = OrderStatus.Pending,
                TotalAmount = totalAmount,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Items = orderItems
            };

            foreach (var item in request.Items)
            {
                await _ticketTypeRepo.IncrementSoldCountAsync(item.TicketTypeId, item.Quantity, ct);
            }

            // Invalidate cached event detail so availableCount reflects the new sold counts
            await InvalidateEventCacheAsync(eventEntity.Slug);

            _orderRepo.Add(order);
            await _unitOfWork.SaveChangesAsync(ct);

            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                Provider = "SePay",
                Status = PaymentStatus.Pending,
                Amount = totalAmount,
                ExternalRef = order.Id.ToString(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _paymentRepo.Add(payment);
            await _unitOfWork.SaveChangesAsync(ct);

            var response = new OrderResponse(
                order.Id,
                order.Status.ToString(),
                order.TotalAmount,
                order.CreatedAt,
                order.ExpiresAt,
                order.PaidAt,
                $"https://qr.sepay.vn/{order.Id}",
                orderItems.Select(oi => new OrderItemResponse(
                    oi.Id,
                    oi.TicketTypeId,
                    "",
                    oi.Quantity,
                    oi.UnitPrice,
                    oi.UnitPrice * oi.Quantity
                )).ToList()
            );

            return Result<OrderResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create order");
            return Result<OrderResponse>.Failure("Failed to create order");
        }
    }

    public async Task<Result<OrderDetailResponse>> GetOrderByIdAsync(Guid orderId, string userId, CancellationToken ct)
    {
        try
        {
            var order = await _orderRepo.GetByIdWithItemsAsync(orderId, ct);
            if (order == null)
                return Result<OrderDetailResponse>.Failure("Order not found", ResultError.NotFound);

            if (order.UserId != userId)
                return Result<OrderDetailResponse>.Failure("Not authorized", ResultError.Forbidden);

            var tickets = await _ticketRepo.GetByOrderAsync(orderId, ct) ?? [];

            // QR images are fetched on-demand via GET /api/tickets/{id}/qr — skip expensive generation here
            var ticketResponses = tickets.Select(t => new TicketResponse(
                t.Id, t.OrderItem?.TicketType?.Name ?? "", "", t.IsCheckedIn
            )).ToList();

            return Result<OrderDetailResponse>.Success(new OrderDetailResponse(
                order.Id,
                order.Status.ToString(),
                order.TotalAmount,
                order.CreatedAt,
                order.ExpiresAt,
                order.PaidAt,
                order.Items.Select(oi => new OrderItemResponse(
                    oi.Id,
                    oi.TicketTypeId,
                    oi.TicketType?.Name ?? "",
                    oi.Quantity,
                    oi.UnitPrice,
                    oi.UnitPrice * oi.Quantity
                )).ToList(),
                ticketResponses,
                order.Payment != null ? new PaymentResponse(
                    order.Payment.Id,
                    order.Payment.Provider,
                    order.Payment.ExternalRef,
                    order.Payment.Amount,
                    order.Payment.ProcessedAt
                ) : null
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get order {OrderId}", orderId);
            return Result<OrderDetailResponse>.Failure("Failed to load order details", ResultError.Internal);
        }
    }

    public async Task<Result<List<OrderResponse>>> GetUserOrdersAsync(string userId, CancellationToken ct)
    {
        try
        {
            var orders = await _orderRepo.GetByUserAsync(userId, ct);
            return Result<List<OrderResponse>>.Success(orders.Select(o => new OrderResponse(
                o.Id,
                o.Status.ToString(),
                o.TotalAmount,
                o.CreatedAt,
                o.ExpiresAt,
                o.PaidAt,
                "",
                o.Items.Select(oi => new OrderItemResponse(
                    oi.Id,
                    oi.TicketTypeId,
                    "",
                    oi.Quantity,
                    oi.UnitPrice,
                    oi.UnitPrice * oi.Quantity
                )).ToList()
            )).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get orders for user {UserId}", userId);
            return Result<List<OrderResponse>>.Failure("Không thể tải danh sách đơn hàng.", ResultError.Internal);
        }
    }

    public async Task<Result<OrderDetailResponse>> ProcessSePayWebhookAsync(string jsonPayload, string signature, CancellationToken ct)
    {
        if (!_sePayHandler.ValidateSignature(jsonPayload, signature))
            return Result<OrderDetailResponse>.Failure("Invalid signature", ResultError.Unauthorized);

        var payload = _sePayHandler.ParsePayload(jsonPayload);
        if (payload == null)
            return Result<OrderDetailResponse>.Failure("Invalid payload");

        var orderRef = _sePayHandler.ExtractOrderReference(payload.Content ?? "");
        if (string.IsNullOrEmpty(orderRef) || !Guid.TryParse(orderRef, out var orderId))
            return Result<OrderDetailResponse>.Failure("Invalid order reference");

        var order = await _orderRepo.GetByIdWithItemsAsync(orderId, ct);
        if (order == null)
            return Result<OrderDetailResponse>.Failure("Order not found", ResultError.NotFound);

        if (order.Status != OrderStatus.Pending)
            return Result<OrderDetailResponse>.Success(new OrderDetailResponse(
                order.Id,
                order.Status.ToString(),
                order.TotalAmount,
                order.CreatedAt,
                order.ExpiresAt,
                order.PaidAt,
                new List<OrderItemResponse>(),
                new List<TicketResponse>(),
                null
            ));

        var tickets = new List<Ticket>();
        foreach (var item in order.Items)
        {
            var ticketType = await _ticketTypeRepo.GetByIdAsync(item.TicketTypeId, ct);

            for (int i = 0; i < item.Quantity; i++)
            {
                var ticketId = Guid.NewGuid();
                var userIdGuid = Guid.Parse(order.UserId);
                var qrPayload = _qrCodeService.GenerateTicketPayload(ticketId, item.TicketTypeId, userIdGuid);
                var qrSignature = _qrCodeService.GenerateHmac(qrPayload);
                var qrData = $"{qrPayload}|{qrSignature}";

                tickets.Add(new Ticket
                {
                    Id = ticketId,
                    OrderItemId = item.Id,
                    UserId = order.UserId,
                    TicketTypeId = item.TicketTypeId,
                    EventId = ticketType?.EventId ?? Guid.Empty,
                    QrCode = qrData,
                    IsCheckedIn = false
                });
            }
        }

        order.Status = OrderStatus.Paid;
        order.PaidAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        if (order.Payment != null)
        {
            order.Payment.Status = PaymentStatus.Success;
            order.Payment.ProcessedAt = DateTime.UtcNow;
            order.Payment.ExternalRef = payload.TransactionCode;
        }

        foreach (var ticket in tickets)
            _ticketRepo.Add(ticket);

        await _unitOfWork.SaveChangesAsync(ct);

        return Result<OrderDetailResponse>.Success(new OrderDetailResponse(
            order.Id,
            order.Status.ToString(),
            order.TotalAmount,
            order.CreatedAt,
            order.ExpiresAt,
            order.PaidAt,
            order.Items.Select(oi => new OrderItemResponse(
                oi.Id,
                oi.TicketTypeId,
                "",
                oi.Quantity,
                oi.UnitPrice,
                oi.UnitPrice * oi.Quantity
            )).ToList(),
            tickets.Select(t => new TicketResponse(
                t.Id,
                "",
                _qrCodeService.GenerateQrCodeBase64(t.QrCode),
                t.IsCheckedIn
            )).ToList(),
            order.Payment != null ? new PaymentResponse(
                order.Payment.Id,
                order.Payment.Provider,
                order.Payment.ExternalRef,
                order.Payment.Amount,
                order.Payment.ProcessedAt
            ) : null
        ));
    }

    public async Task<Result<OrderDetailResponse>> SimulatePaymentAsync(Guid orderId, string userId, CancellationToken ct)
    {
        var order = await _orderRepo.GetByIdWithItemsAsync(orderId, ct);
        if (order == null)
            return Result<OrderDetailResponse>.Failure("Order not found", ResultError.NotFound);

        if (order.UserId != userId)
            return Result<OrderDetailResponse>.Failure("Not authorized", ResultError.Forbidden);

        if (order.Status != OrderStatus.Pending)
            return Result<OrderDetailResponse>.Failure("Order is not pending");

        var tickets = new List<Ticket>();
        foreach (var item in order.Items)
        {
            var ticketType = await _ticketTypeRepo.GetByIdAsync(item.TicketTypeId, ct);

            for (int i = 0; i < item.Quantity; i++)
            {
                var ticketId = Guid.NewGuid();
                var userIdGuid = Guid.Parse(order.UserId);
                var qrPayload = _qrCodeService.GenerateTicketPayload(ticketId, item.TicketTypeId, userIdGuid);
                var qrSignature = _qrCodeService.GenerateHmac(qrPayload);
                var qrData = $"{qrPayload}|{qrSignature}";

                tickets.Add(new Ticket
                {
                    Id = ticketId,
                    OrderItemId = item.Id,
                    UserId = order.UserId,
                    TicketTypeId = item.TicketTypeId,
                    EventId = ticketType?.EventId ?? Guid.Empty,
                    QrCode = qrData,
                    IsCheckedIn = false
                });
            }
        }

        order.Status = OrderStatus.Paid;
        order.PaidAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        if (order.Payment != null)
        {
            order.Payment.Status = PaymentStatus.Success;
            order.Payment.ProcessedAt = DateTime.UtcNow;
        }

        foreach (var ticket in tickets)
            _ticketRepo.Add(ticket);

        await _unitOfWork.SaveChangesAsync(ct);

        return Result<OrderDetailResponse>.Success(new OrderDetailResponse(
            order.Id,
            order.Status.ToString(),
            order.TotalAmount,
            order.CreatedAt,
            order.ExpiresAt,
            order.PaidAt,
            order.Items.Select(oi => new OrderItemResponse(
                oi.Id,
                oi.TicketTypeId,
                "",
                oi.Quantity,
                oi.UnitPrice,
                oi.UnitPrice * oi.Quantity
            )).ToList(),
            tickets.Select(t => new TicketResponse(
                t.Id,
                "",
                _qrCodeService.GenerateQrCodeBase64(t.QrCode),
                t.IsCheckedIn
            )).ToList(),
            order.Payment != null ? new PaymentResponse(
                order.Payment.Id,
                order.Payment.Provider,
                order.Payment.ExternalRef,
                order.Payment.Amount,
                order.Payment.ProcessedAt
            ) : null
        ));
    }

    public async Task<Result<bool>> CancelOrderAsync(Guid orderId, string userId, CancellationToken ct)
    {
        var order = await _orderRepo.GetByIdWithItemsAsync(orderId, ct);
        if (order == null)
            return Result<bool>.Failure("Order not found", ResultError.NotFound);

        if (order.UserId != userId)
            return Result<bool>.Failure("Not authorized", ResultError.Forbidden);

        if (order.Status != OrderStatus.Pending)
            return Result<bool>.Failure("Only pending orders can be cancelled");

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;

        // Release ticket reservations
        string? cancelEventSlug = null;
        if (order.Items.Count > 0)
        {
            var firstTicketType = await _ticketTypeRepo.GetByIdAsync(order.Items.First().TicketTypeId, ct);
            if (firstTicketType != null)
            {
                var cancelEvent = await _eventRepo.GetByIdAsync(firstTicketType.EventId, ct);
                cancelEventSlug = cancelEvent?.Slug;
            }
        }

        foreach (var item in order.Items)
        {
            await _ticketTypeRepo.IncrementSoldCountAsync(item.TicketTypeId, -item.Quantity, ct);
        }

        if (cancelEventSlug != null)
            await InvalidateEventCacheAsync(cancelEventSlug);

        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> RefundOrderAsync(Guid orderId, string userId, CancellationToken ct)
    {
        var order = await _orderRepo.GetByIdWithItemsAsync(orderId, ct);
        if (order == null)
            return Result<bool>.Failure("Order not found", ResultError.NotFound);

        // Only the event organizer can issue refunds
        if (order.Items.Count == 0)
            return Result<bool>.Failure("Order has no items");

        var ticketType = await _ticketTypeRepo.GetByIdAsync(order.Items.First().TicketTypeId, ct);
        var eventEntity = ticketType != null ? await _eventRepo.GetByIdAsync(ticketType.EventId, ct) : null;
        if (eventEntity == null || eventEntity.OrganizerId != userId)
            return Result<bool>.Failure("Only the event organizer can refund orders", ResultError.Forbidden);

        if (order.Status != OrderStatus.Paid)
            return Result<bool>.Failure("Only paid orders can be refunded");

        order.Status = OrderStatus.Refunded;
        order.UpdatedAt = DateTime.UtcNow;

        // Release ticket counts
        foreach (var item in order.Items)
        {
            await _ticketTypeRepo.IncrementSoldCountAsync(item.TicketTypeId, -item.Quantity, ct);
        }

        // Invalidate cached event detail so availableCount reflects the restored counts
        await InvalidateEventCacheAsync(eventEntity.Slug);

        // Cancel issued tickets
        var tickets = await _ticketRepo.GetByOrderAsync(orderId, ct);
        foreach (var ticket in tickets)
        {
            _ticketRepo.Remove(ticket);
        }

        // Update payment status
        if (order.Payment != null)
        {
            order.Payment.Status = PaymentStatus.Refunded;
            order.Payment.UpdatedAt = DateTime.UtcNow;
        }

        _orderRepo.Update(order);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    /// <summary>Bust the Redis event-by-slug cache so availableCount is fresh on next request.</summary>
    private async Task InvalidateEventCacheAsync(string slug)
    {
        try
        {
            var db = _redis.GetDatabase();
            await db.KeyDeleteAsync(CacheKeys.EventBySlug(slug));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate event cache for slug {Slug}", slug);
        }
    }
}
