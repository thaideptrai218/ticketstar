namespace TicketStar.Application.DTOs.Events;

public record CreateEventRequest(
    string Title,
    string? Description,
    DateTime StartAt,
    DateTime EndAt,
    string? Venue,
    string? Category,
    string? ImageUrl,
    string Slug,
    List<CreateTicketTypeRequest> TicketTypes
);

public record UpdateEventRequest(
    string? Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    string? Venue,
    string? Category,
    string? ImageUrl
);

public record PublishEventRequest(
    bool Publish
);

public record EventDetailResponse(
    Guid Id,
    string Slug,
    string Title,
    string? Description,
    DateTime StartAt,
    DateTime EndAt,
    string? Venue,
    string? Category,
    string Status,
    string? ImageUrl,
    string OrganizerId,
    string OrganizerName,
    List<TicketTypeResponse> TicketTypes,
    DateTime CreatedAt
);

public record EventListItemResponse(
    Guid Id,
    string Slug,
    string Title,
    string? Description,
    DateTime StartAt,
    DateTime EndAt,
    string? Venue,
    string? Category,
    string? ImageUrl,
    string Status,
    int TotalTicketCount,
    int AvailableTicketCount,
    decimal MinPrice
);

public record CreateTicketTypeRequest(
    string Name,
    string Description,
    decimal Price,
    int Quota,
    int MaxPerUser
);

public record UpdateTicketTypeRequest(
    string? Name,
    string? Description,
    decimal? Price,
    int? Quota,
    int? MaxPerUser
);

public record TicketTypeResponse(
    Guid Id,
    string Name,
    string Description,
    decimal Price,
    int Quota,
    int SoldCount,
    int AvailableCount,
    int MaxPerUser
);
