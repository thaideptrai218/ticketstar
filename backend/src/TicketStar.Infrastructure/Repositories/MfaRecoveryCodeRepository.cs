using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class MfaRecoveryCodeRepository : EfRepository<MfaRecoveryCode>, IMfaRecoveryCodeRepository
{
    public MfaRecoveryCodeRepository(AppDbContext db) : base(db) { }

    public Task<List<MfaRecoveryCode>> GetByUserAsync(string userId, CancellationToken ct = default)
        => DbSet.Where(rc => rc.UserId == userId).ToListAsync(ct);

    public async Task DeleteAllByUserAsync(string userId, CancellationToken ct = default)
    {
        var codes = await DbSet.Where(rc => rc.UserId == userId).ToListAsync(ct);
        DbSet.RemoveRange(codes);
    }
}
