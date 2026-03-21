using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class OrderRepository : EfRepository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext db) : base(db) { }

    public async Task<List<Order>> GetByUserAsync(string userId, CancellationToken ct = default)
        => await DbSet
            .Where(o => o.UserId == userId)
            .Include(o => o.Items)
            .Include(o => o.Payment)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

    public async Task<Order?> GetByIdWithItemsAsync(Guid orderId, CancellationToken ct = default)
        => await DbSet
            .Where(o => o.Id == orderId)
            .Include(o => o.Items)
            .ThenInclude(oi => oi.TicketType)
            .Include(o => o.Payment)
            .Include(o => o.User)
            .AsSplitQuery()
            .FirstOrDefaultAsync(ct);

    public async Task<List<Order>> GetPendingExpiredAsync(CancellationToken ct = default)
        => await DbSet
            .Where(o => o.Status == OrderStatus.Pending && o.ExpiresAt <= DateTime.UtcNow)
            .Include(o => o.Items)
            .ToListAsync(ct);

    public async Task<Order?> GetByExternalRefAsync(string externalRef, CancellationToken ct = default)
        => await DbSet
            .Include(o => o.Payment)
            .Where(o => o.Payment != null && o.Payment.ExternalRef == externalRef)
            .FirstOrDefaultAsync(ct);
}
