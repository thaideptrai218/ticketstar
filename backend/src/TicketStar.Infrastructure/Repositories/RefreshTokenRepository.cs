using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class RefreshTokenRepository : EfRepository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(AppDbContext db) : base(db) { }

    public async Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(r => r.TokenHash == tokenHash, ct);

    public async Task<RefreshToken?> GetByHashWithUserAndSessionAsync(string tokenHash, CancellationToken ct = default)
        => await DbSet.Include(r => r.User).Include(r => r.Session)
            .FirstOrDefaultAsync(r => r.TokenHash == tokenHash, ct);

    public async Task<List<RefreshToken>> GetActiveByUserAsync(string userId, CancellationToken ct = default)
        => await DbSet.Where(r => r.UserId == userId && r.RevokedAt == null).ToListAsync(ct);

    public async Task<List<RefreshToken>> GetActiveByFamilyAsync(string familyId, CancellationToken ct = default)
        => await DbSet.Where(r => r.FamilyId == familyId && r.RevokedAt == null).ToListAsync(ct);
}
