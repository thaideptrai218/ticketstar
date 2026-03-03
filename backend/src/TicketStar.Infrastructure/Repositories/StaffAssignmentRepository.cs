using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class StaffAssignmentRepository : EfRepository<StaffAssignment>, IStaffAssignmentRepository
{
    public StaffAssignmentRepository(AppDbContext db) : base(db) { }

    public async Task<List<StaffAssignment>> GetByEventAsync(Guid eventId, CancellationToken ct = default)
        => await DbSet
            .Where(sa => sa.EventId == eventId)
            .Include(sa => sa.User)
            .Include(sa => sa.Assigner)
            .ToListAsync(ct);

    public async Task<List<StaffAssignment>> GetByStaffAsync(string staffId, CancellationToken ct = default)
        => await DbSet
            .Where(sa => sa.UserId == staffId)
            .Include(sa => sa.Event)
            .ToListAsync(ct);

    public async Task<bool> IsAssignedAsync(string staffId, Guid eventId, CancellationToken ct = default)
        => await DbSet
            .AnyAsync(sa => sa.UserId == staffId && sa.EventId == eventId, ct);
}
