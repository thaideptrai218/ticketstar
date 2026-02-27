using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Interfaces;

public interface IAuthIdentityRepository : IRepository<AuthIdentity>
{
    Task<bool> HasProviderAsync(string userId, AuthProvider provider, CancellationToken ct = default);
    Task<AuthIdentity?> GetByUserAndProviderAsync(string userId, AuthProvider provider, CancellationToken ct = default);
}
