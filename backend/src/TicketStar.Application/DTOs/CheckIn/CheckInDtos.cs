namespace TicketStar.Application.DTOs.CheckIn;

public record CheckInTicketRequest(
    string QrCode
);

public record CheckInResponse(
    Guid TicketId,
    string TicketTypeName,
    string AttendeeName,
    bool IsCheckedIn,
    DateTime? CheckedInAt,
    string? ScannerName
);

public record EventCheckInStatsResponse(
    int TotalTickets,
    int CheckedInTickets,
    int PendingTickets
);
