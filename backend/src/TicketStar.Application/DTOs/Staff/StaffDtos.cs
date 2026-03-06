namespace TicketStar.Application.DTOs.Staff;

public record AssignStaffRequest(string Email);

public record StaffAssignmentResponse(
    Guid Id,
    string UserId,
    string Email,
    string? FullName,
    DateTime AssignedAt
);
