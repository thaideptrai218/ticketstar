using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class CheckInRepository : EfRepository<CheckIn>, ICheckInRepository
{
    public CheckInRepository(AppDbContext db) : base(db) { }

    public async Task<CheckIn?> GetByTicketAsync(Guid ticketId, CancellationToken ct = default)
        => await DbSet
            .Include(c => c.Ticket)
            .Include(c => c.Scanner)
            .Include(c => c.Event)
            .FirstOrDefaultAsync(c => c.TicketId == ticketId, ct);

    public async Task<List<CheckIn>> GetByEventAsync(Guid eventId, CancellationToken ct = default)
        => await DbSet
            .Where(c => c.EventId == eventId)
            .Include(c => c.Ticket)
            .ThenInclude(t => t.User)
            .Include(c => c.Scanner)
            .AsSplitQuery()
            .OrderByDescending(c => c.ScannedAt)
            .ToListAsync(ct);

    public async Task<int> GetCheckInCountAsync(Guid eventId, CancellationToken ct = default)
        => await DbSet
            .Where(c => c.EventId == eventId)
            .CountAsync(ct);
}
