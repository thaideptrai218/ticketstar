using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Staff;

namespace TicketStar.Application.Interfaces;

public interface IStaffService
{
    Task<Result<StaffAssignmentResponse>> AssignStaffAsync(string organizerId, Guid eventId, AssignStaffRequest request, CancellationToken ct);
    Task<Result<bool>> RemoveStaffAsync(string organizerId, Guid eventId, string staffUserId, CancellationToken ct);
    Task<Result<List<StaffAssignmentResponse>>> GetEventStaffAsync(string userId, Guid eventId, CancellationToken ct);
    Task<Result<List<StaffEventResponse>>> GetMyStaffEventsAsync(string staffId, CancellationToken ct);
}
