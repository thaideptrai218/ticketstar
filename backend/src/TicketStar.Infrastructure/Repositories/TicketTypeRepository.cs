using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class TicketTypeRepository : EfRepository<TicketType>, ITicketTypeRepository
{
    public TicketTypeRepository(AppDbContext db) : base(db) { }

    public async Task<List<TicketType>> GetByEventAsync(Guid eventId, CancellationToken ct = default)
        => await DbSet
            .Where(tt => tt.EventId == eventId)
            .OrderBy(tt => tt.Price)
            .ToListAsync(ct);

    public async Task<int> GetSoldCountAsync(Guid ticketTypeId, CancellationToken ct = default)
    {
        var ticketType = await DbSet.FindAsync(new object[] { ticketTypeId }, ct);
        return ticketType?.SoldCount ?? 0;
    }

    public async Task IncrementSoldCountAsync(Guid ticketTypeId, int quantity, CancellationToken ct = default)
    {
        // Raw SQL for atomic increment (no race condition)
        await DbSet.Where(tt => tt.Id == ticketTypeId)
            .ExecuteUpdateAsync(s => s.SetProperty(tt => tt.SoldCount, tt => tt.SoldCount + quantity), ct);
    }

    public async Task<bool> IsAvailableAsync(Guid ticketTypeId, int quantity, CancellationToken ct = default)
        => await DbSet
            .Where(tt => tt.Id == ticketTypeId && tt.SoldCount + quantity <= tt.Quota)
            .AnyAsync(ct);
}
