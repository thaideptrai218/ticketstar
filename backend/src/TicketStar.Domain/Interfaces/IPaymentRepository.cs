using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IPaymentRepository : IRepository<Payment>
{
    Task<Payment?> GetByOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<Payment?> GetByExternalRefAsync(string externalRef, CancellationToken ct = default);
}
