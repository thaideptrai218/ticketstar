using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IOrderRepository : IRepository<Order>
{
    Task<List<Order>> GetByUserAsync(string userId, CancellationToken ct = default);
    Task<Order?> GetByIdWithItemsAsync(Guid orderId, CancellationToken ct = default);
    Task<List<Order>> GetPendingExpiredAsync(CancellationToken ct = default);
    Task<Order?> GetByExternalRefAsync(string externalRef, CancellationToken ct = default);
}
