namespace TicketStar.Application.DTOs.Staff;

public record AssignStaffRequest(string Email);

public record StaffAssignmentResponse(
    Guid Id,
    string UserId,
    string Email,
    string? FullName,
    DateTime AssignedAt
);

public record StaffEventResponse(
    Guid EventId,
    string Title,
    string? Venue,
    DateTime StartAt,
    DateTime EndAt,
    string Status
);
