using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class OrganizerProfileRepository : EfRepository<OrganizerProfile>, IOrganizerProfileRepository
{
    public OrganizerProfileRepository(AppDbContext db) : base(db) { }

    public async Task<OrganizerProfile?> GetByUserIdAsync(string userId, CancellationToken ct = default)
        => await DbSet
            .FirstOrDefaultAsync(x => x.UserId == userId, ct);

    public async Task<List<OrganizerProfile>> GetAllByUserIdAsync(string userId, CancellationToken ct = default)
        => await DbSet
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);
}
