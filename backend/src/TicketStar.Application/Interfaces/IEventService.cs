using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Events;

namespace TicketStar.Application.Interfaces;

public interface IEventService
{
    Task<Result<EventDetailResponse>> CreateEventAsync(string organizerId, CreateEventRequest request, CancellationToken ct);
    Task<Result<EventDetailResponse>> UpdateEventAsync(string userId, Guid eventId, UpdateEventRequest request, CancellationToken ct);
    Task<Result<bool>> DeleteEventAsync(string userId, Guid eventId, CancellationToken ct);
    Task<Result<EventDetailResponse>> GetEventBySlugAsync(string slug, CancellationToken ct);
    Task<Result<PaginatedResponse<EventListItemResponse>>> ListEventsAsync(PaginatedRequest request, CancellationToken ct);
    Task<Result<List<EventListItemResponse>>> GetOrganizerEventsAsync(string organizerId, CancellationToken ct);
    Task<Result<EventDetailResponse>> PublishEventAsync(string userId, Guid eventId, CancellationToken ct);
    Task<Result<EventDetailResponse>> GetEventByIdAsync(Guid eventId, string userId, CancellationToken ct);
}
