namespace TicketStar.Application.DTOs.Tickets;

public record MyTicketResponse(
    Guid Id,
    Guid EventId,
    string EventTitle,
    string? EventVenue,
    DateTime EventStartAt,
    string TicketTypeName,
    bool IsCheckedIn,
    DateTime CreatedAt
);

public record TicketQrResponse(string QrCodeBase64);

public record TicketDetailResponse(
    Guid Id,
    Guid EventId,
    string EventTitle,
    string? EventVenue,
    DateTime EventStartAt,
    DateTime EventEndAt,
    string TicketTypeName,
    decimal Price,
    string QrCodeBase64,
    bool IsCheckedIn,
    DateTime? CheckedInAt,
    DateTime CreatedAt
);

public record TransferTicketRequest(string RecipientEmail);
