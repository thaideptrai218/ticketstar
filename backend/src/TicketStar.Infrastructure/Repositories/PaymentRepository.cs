using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class PaymentRepository : EfRepository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext db) : base(db) { }

    public async Task<Payment?> GetByOrderAsync(Guid orderId, CancellationToken ct = default)
        => await DbSet
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.OrderId == orderId, ct);

    public async Task<Payment?> GetByExternalRefAsync(string externalRef, CancellationToken ct = default)
        => await DbSet
            .Include(p => p.Order)
            .ThenInclude(o => o.Items)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.ExternalRef == externalRef, ct);
}
