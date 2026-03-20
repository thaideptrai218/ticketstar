using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class OrderExpiryService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OrderExpiryService> _logger;

    public OrderExpiryService(IServiceScopeFactory scopeFactory, ILogger<OrderExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OrderExpiryService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessExpiredOrdersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing expired orders");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task ProcessExpiredOrdersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var orderRepo = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        var ticketTypeRepo = scope.ServiceProvider.GetRequiredService<ITicketTypeRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

        var expiredOrders = await orderRepo.GetPendingExpiredAsync(ct);
        if (expiredOrders.Count == 0) return;

        _logger.LogInformation("Expiring {Count} orders", expiredOrders.Count);

        foreach (var order in expiredOrders)
        {
            order.Status = Domain.Enums.OrderStatus.Expired;
            order.UpdatedAt = DateTime.UtcNow;

            // Release ticket reservations
            foreach (var item in order.Items)
            {
                await ticketTypeRepo.IncrementSoldCountAsync(item.TicketTypeId, -item.Quantity, ct);
            }

            orderRepo.Update(order);
        }

        await unitOfWork.SaveChangesAsync(ct);
        _logger.LogInformation("Expired {Count} orders successfully", expiredOrders.Count);
    }
}
