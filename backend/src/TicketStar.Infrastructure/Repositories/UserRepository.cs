using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class UserRepository : EfRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext db) : base(db) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(u => u.Email == email, ct);

    public async Task<User?> GetByEmailIgnoreFiltersAsync(string email, CancellationToken ct = default)
        => await DbSet.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == email, ct);

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await DbSet.IgnoreQueryFilters().AnyAsync(u => u.Email == email, ct);

    public async Task IncrementFailedLoginAsync(string userId, CancellationToken ct = default)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.FailedLoginCount, u => u.FailedLoginCount + 1), ct);

    public async Task LockAccountAsync(string userId, DateTime until, CancellationToken ct = default)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedUntil, until), ct);
}
