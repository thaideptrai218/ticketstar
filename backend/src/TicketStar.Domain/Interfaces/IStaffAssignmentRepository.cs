using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IStaffAssignmentRepository : IRepository<StaffAssignment>
{
    Task<List<StaffAssignment>> GetByEventAsync(Guid eventId, CancellationToken ct = default);
    Task<List<StaffAssignment>> GetByStaffAsync(string staffId, CancellationToken ct = default);
    Task<bool> IsAssignedAsync(string staffId, Guid eventId, CancellationToken ct = default);
}
