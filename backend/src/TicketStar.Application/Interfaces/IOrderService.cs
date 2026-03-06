using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Orders;

namespace TicketStar.Application.Interfaces;

public interface IOrderService
{
    Task<Result<OrderResponse>> CreateOrderAsync(string userId, CreateOrderRequest request, CancellationToken ct);
    Task<Result<OrderDetailResponse>> GetOrderByIdAsync(Guid orderId, string userId, CancellationToken ct);
    Task<Result<List<OrderResponse>>> GetUserOrdersAsync(string userId, CancellationToken ct);
    Task<Result<OrderDetailResponse>> ProcessSePayWebhookAsync(string jsonPayload, string signature, CancellationToken ct);
    Task<Result<bool>> CancelOrderAsync(Guid orderId, string userId, CancellationToken ct);
    Task<Result<bool>> RefundOrderAsync(Guid orderId, string userId, CancellationToken ct);
}
