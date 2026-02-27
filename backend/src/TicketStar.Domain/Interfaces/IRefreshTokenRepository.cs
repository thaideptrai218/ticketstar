using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default);
    Task<RefreshToken?> GetByHashWithUserAndSessionAsync(string tokenHash, CancellationToken ct = default);
    Task<List<RefreshToken>> GetActiveByUserAsync(string userId, CancellationToken ct = default);
    Task<List<RefreshToken>> GetActiveByFamilyAsync(string familyId, CancellationToken ct = default);
}
