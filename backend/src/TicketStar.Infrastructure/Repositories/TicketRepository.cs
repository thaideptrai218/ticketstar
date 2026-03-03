using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class TicketRepository : EfRepository<Ticket>, ITicketRepository
{
    public TicketRepository(AppDbContext db) : base(db) { }

    public async Task<List<Ticket>> GetByUserAsync(string userId, CancellationToken ct = default)
        => await DbSet
            .Where(t => t.UserId == userId)
            .Include(t => t.OrderItem)
            .ThenInclude(oi => oi.Order)
            .Include(t => t.TicketType)
            .Include(t => t.Event)
            .Include(t => t.CheckIn)
            .AsSplitQuery()
            .ToListAsync(ct);

    public async Task<List<Ticket>> GetByOrderAsync(Guid orderId, CancellationToken ct = default)
        => await DbSet
            .Where(t => t.OrderItem != null && t.OrderItem.OrderId == orderId)
            .Include(t => t.OrderItem)
            .ThenInclude(oi => oi.TicketType)
            .Include(t => t.CheckIn)
            .ToListAsync(ct);

    public async Task<Ticket?> GetByQrCodeAsync(string qrCode, CancellationToken ct = default)
        => await DbSet
            .Include(t => t.OrderItem)
            .ThenInclude(oi => oi.Order)
            .Include(t => t.TicketType)
            .Include(t => t.Event)
            .Include(t => t.CheckIn)
            .AsSplitQuery()
            .FirstOrDefaultAsync(t => t.QrCode == qrCode, ct);

    public async Task<List<Ticket>> GetByEventAsync(Guid eventId, CancellationToken ct = default)
        => await DbSet
            .Where(t => t.EventId == eventId)
            .Include(t => t.User)
            .Include(t => t.OrderItem)
            .ThenInclude(oi => oi.TicketType)
            .Include(t => t.CheckIn)
            .AsSplitQuery()
            .ToListAsync(ct);

    public async Task UpdateCheckedInAsync(Guid ticketId, bool isCheckedIn, CancellationToken ct = default)
        => await DbSet
            .Where(t => t.Id == ticketId)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsCheckedIn, isCheckedIn), ct);
}
