using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class MagicLinkRepository : EfRepository<MagicLink>, IMagicLinkRepository
{
    public MagicLinkRepository(AppDbContext db) : base(db) { }

    public async Task<MagicLink?> GetByHashWithUserAsync(string tokenHash, CancellationToken ct = default)
        => await DbSet.Include(m => m.User)
            .FirstOrDefaultAsync(m => m.TokenHash == tokenHash && m.UsedAt == null, ct);
}
