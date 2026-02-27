using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class AuthIdentityRepository : EfRepository<AuthIdentity>, IAuthIdentityRepository
{
    public AuthIdentityRepository(AppDbContext db) : base(db) { }

    public async Task<bool> HasProviderAsync(string userId, AuthProvider provider, CancellationToken ct = default)
        => await DbSet.AnyAsync(a => a.UserId == userId && a.Provider == provider, ct);

    public async Task<AuthIdentity?> GetByUserAndProviderAsync(string userId, AuthProvider provider, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(a => a.UserId == userId && a.Provider == provider, ct);
}
