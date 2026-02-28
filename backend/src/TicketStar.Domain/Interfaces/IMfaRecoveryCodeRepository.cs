using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IMfaRecoveryCodeRepository : IRepository<MfaRecoveryCode>
{
    Task<List<MfaRecoveryCode>> GetByUserAsync(string userId, CancellationToken ct = default);
    Task DeleteAllByUserAsync(string userId, CancellationToken ct = default);
}
