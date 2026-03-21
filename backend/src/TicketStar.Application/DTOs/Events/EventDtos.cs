namespace TicketStar.Application.DTOs.Events;

public record CreateEventRequest(
    string Title,
    string? Description,
    DateTime StartAt,
    DateTime EndAt,
    string? Venue,
    string? City,
    string? Province,
    string? Category,
    string? ImageUrl,
    string Slug,
    // Wizard new fields
    string? BannerImageUrl,
    bool IsOnline,
    int? MaxTicketsPerOrder,
    string? RefundPolicy,
    string? ContentWarning,
    string? PaymentTerms,
    List<CreateTicketTypeRequest> TicketTypes,
    /// <summary>Admin-only: create event on behalf of a specific organizer (UserId).</summary>
    string? OrganizerIdOverride = null
);

public record UpdateEventRequest(
    string? Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    string? Venue,
    string? City,
    string? Province,
    string? Category,
    string? ImageUrl,
    // Wizard new fields
    string? BannerImageUrl,
    bool? IsOnline,
    int? MaxTicketsPerOrder,
    string? RefundPolicy,
    string? ContentWarning,
    string? PaymentTerms
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
    string? City,
    string? Province,
    string? Category,
    string Status,
    string? ImageUrl,
    string? BannerImageUrl,
    bool IsOnline,
    int? MaxTicketsPerOrder,
    string? RefundPolicy,
    string? ContentWarning,
    string? PaymentTerms,
    string OrganizerId,
    string OrganizerName,
    string? OrganizerLogoUrl,
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
    string? BannerImageUrl,
    bool IsOnline,
    string Status,
    int TotalTicketCount,
    int AvailableTicketCount,
    decimal MinPrice
);

public record CreateTicketTypeRequest(
    string Name,
    string? Description,
    decimal Price,
    int Quota,
    int MaxPerUser,
    DateTime? SaleStartAt,
    DateTime? SaleEndAt
);

public record UpdateTicketTypeRequest(
    string? Name,
    string? Description,
    decimal? Price,
    int? Quota,
    int? MaxPerUser,
    DateTime? SaleStartAt,
    DateTime? SaleEndAt
);

public record TicketTypeResponse(
    Guid Id,
    string Name,
    string? Description,
    decimal Price,
    int Quota,
    int SoldCount,
    int AvailableCount,
    int MaxPerUser,
    DateTime? SaleStartAt,
    DateTime? SaleEndAt
);
