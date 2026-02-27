using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByEmailIgnoreFiltersAsync(string email, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task IncrementFailedLoginAsync(string userId, CancellationToken ct = default);
    Task LockAccountAsync(string userId, DateTime until, CancellationToken ct = default);
}
