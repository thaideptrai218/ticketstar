using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Events;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;
using AppCommon = TicketStar.Application.Common;
using DomainCommon = TicketStar.Domain.Common;

namespace TicketStar.Application.Services;

public class EventService : IEventService
{
    private readonly IEventRepository _eventRepo;
    private readonly ITicketTypeRepository _ticketTypeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<EventService> _logger;

    public EventService(
        IEventRepository eventRepo,
        ITicketTypeRepository ticketTypeRepo,
        IUnitOfWork unitOfWork,
        IConnectionMultiplexer redis,
        ILogger<EventService> logger)
    {
        _eventRepo = eventRepo;
        _ticketTypeRepo = ticketTypeRepo;
        _unitOfWork = unitOfWork;
        _redis = redis;
        _logger = logger;
    }

    public async Task<Result<EventDetailResponse>> CreateEventAsync(string organizerId, CreateEventRequest request, CancellationToken ct)
    {
        if (request.EndAt <= request.StartAt)
            return Result<EventDetailResponse>.Failure("EndAt must be after StartAt");

        if (request.TicketTypes.Count == 0)
            return Result<EventDetailResponse>.Failure("At least one ticket type is required");

        if (await _eventRepo.SlugExistsAsync(request.Slug, ct))
            return Result<EventDetailResponse>.Failure("Slug already exists");

        var eventEntity = new Event
        {
            Id = Guid.NewGuid(),
            OrganizerId = organizerId,
            Title = request.Title,
            Description = request.Description,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            Venue = request.Venue,
            ImageUrl = request.ImageUrl,
            Slug = request.Slug,
            Status = EventStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var ticketTypes = request.TicketTypes.Select(tt => new TicketType
        {
            Id = Guid.NewGuid(),
            EventId = eventEntity.Id,
            Name = tt.Name,
            Price = tt.Price,
            Quota = tt.Quota,
            SoldCount = 0
        }).ToList();

        try
        {
            _eventRepo.Add(eventEntity);
            foreach (var tt in ticketTypes)
                _ticketTypeRepo.Add(tt);

            await _unitOfWork.SaveChangesAsync(ct);

            var response = await MapToDetailResponseAsync(eventEntity.Id, ct);
            return Result<EventDetailResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create event");
            return Result<EventDetailResponse>.Failure("Failed to create event");
        }
    }

    public async Task<Result<EventDetailResponse>> UpdateEventAsync(string userId, Guid eventId, UpdateEventRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<EventDetailResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != userId)
            return Result<EventDetailResponse>.Failure("Not authorized", ResultError.Forbidden);

        if (request.StartAt.HasValue && request.EndAt.HasValue && request.EndAt <= request.StartAt)
            return Result<EventDetailResponse>.Failure("EndAt must be after StartAt");

        if (request.Title != null) eventEntity.Title = request.Title;
        if (request.Description != null) eventEntity.Description = request.Description;
        if (request.StartAt.HasValue) eventEntity.StartAt = request.StartAt.Value;
        if (request.EndAt.HasValue) eventEntity.EndAt = request.EndAt.Value;
        if (request.Venue != null) eventEntity.Venue = request.Venue;
        if (request.ImageUrl != null) eventEntity.ImageUrl = request.ImageUrl;
        eventEntity.UpdatedAt = DateTime.UtcNow;

        try
        {
            _eventRepo.Update(eventEntity);
            await _unitOfWork.SaveChangesAsync(ct);

            await InvalidateEventCacheAsync(eventEntity.Slug, eventId, ct);

            var response = await MapToDetailResponseAsync(eventId, ct);
            return Result<EventDetailResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update event");
            return Result<EventDetailResponse>.Failure("Failed to update event");
        }
    }

    public async Task<Result<bool>> DeleteEventAsync(string userId, Guid eventId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<bool>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != userId)
            return Result<bool>.Failure("Not authorized", ResultError.Forbidden);

        try
        {
            _eventRepo.Remove(eventEntity);
            await _unitOfWork.SaveChangesAsync(ct);

            await InvalidateEventCacheAsync(eventEntity.Slug, eventId, ct);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete event");
            return Result<bool>.Failure("Failed to delete event");
        }
    }

    public async Task<Result<EventDetailResponse>> GetEventBySlugAsync(string slug, CancellationToken ct)
    {
        var cacheKey = CacheKeys.EventBySlug(slug);
        var cached = await GetFromCacheAsync<EventDetailResponse>(cacheKey);
        if (cached != null)
            return Result<EventDetailResponse>.Success(cached);

        var eventEntity = await _eventRepo.GetBySlugAsync(slug, ct);
        if (eventEntity == null)
            return Result<EventDetailResponse>.Failure("Event not found", ResultError.NotFound);

        var response = await MapToDetailResponseAsync(eventEntity.Id, ct);
        await SetCacheAsync(cacheKey, response, TimeSpan.FromMinutes(10));

        return Result<EventDetailResponse>.Success(response);
    }

    public async Task<Result<AppCommon.PaginatedResponse<EventListItemResponse>>> ListEventsAsync(AppCommon.PaginatedRequest request, CancellationToken ct)
    {
        var domainRequest = new DomainCommon.PaginatedRequest
        {
            Page = request.Page,
            PageSize = request.PageSize
        };

        var cacheKey = CacheKeys.EventList(request.Page, request.PageSize);
        var cached = await GetFromCacheAsync<AppCommon.PaginatedResponse<EventListItemResponse>>(cacheKey);
        if (cached != null)
            return Result<AppCommon.PaginatedResponse<EventListItemResponse>>.Success(cached);

        var result = await _eventRepo.ListPaginatedAsync(domainRequest, ct);

        var items = result.Items.Select(MapToListItemResponse).ToList();
        var response = new AppCommon.PaginatedResponse<EventListItemResponse>
        {
            Items = items,
            TotalCount = result.Total,
            Page = result.Page,
            PageSize = result.PageSize
        };

        await SetCacheAsync(cacheKey, response, TimeSpan.FromMinutes(5));
        return Result<AppCommon.PaginatedResponse<EventListItemResponse>>.Success(response);
    }

    public async Task<Result<List<EventListItemResponse>>> GetOrganizerEventsAsync(string organizerId, CancellationToken ct)
    {
        var events = await _eventRepo.GetByOrganizerAsync(organizerId, ct);
        return Result<List<EventListItemResponse>>.Success(events.Select(MapToListItemResponse).ToList());
    }

    public async Task<Result<EventDetailResponse>> PublishEventAsync(string userId, Guid eventId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<EventDetailResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != userId)
            return Result<EventDetailResponse>.Failure("Not authorized", ResultError.Forbidden);

        eventEntity.Status = EventStatus.Published;
        eventEntity.UpdatedAt = DateTime.UtcNow;

        try
        {
            _eventRepo.Update(eventEntity);
            await _unitOfWork.SaveChangesAsync(ct);

            await InvalidateEventCacheAsync(eventEntity.Slug, eventId, ct);

            var response = await MapToDetailResponseAsync(eventId, ct);
            return Result<EventDetailResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish event");
            return Result<EventDetailResponse>.Failure("Failed to publish event");
        }
    }

    public async Task<Result<EventDetailResponse>> UnpublishEventAsync(string userId, Guid eventId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<EventDetailResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != userId)
            return Result<EventDetailResponse>.Failure("Not authorized", ResultError.Forbidden);

        eventEntity.Status = EventStatus.Draft;
        eventEntity.UpdatedAt = DateTime.UtcNow;

        try
        {
            _eventRepo.Update(eventEntity);
            await _unitOfWork.SaveChangesAsync(ct);
            await InvalidateEventCacheAsync(eventEntity.Slug, eventId, ct);

            var response = await MapToDetailResponseAsync(eventId, ct);
            return Result<EventDetailResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to unpublish event");
            return Result<EventDetailResponse>.Failure("Failed to unpublish event");
        }
    }

    public async Task<Result<EventDetailResponse>> GetEventByIdAsync(Guid eventId, string userId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<EventDetailResponse>.Failure("Event not found", ResultError.NotFound);

        var response = await MapToDetailResponseAsync(eventId, ct);
        return Result<EventDetailResponse>.Success(response);
    }

    private async Task<EventDetailResponse> MapToDetailResponseAsync(Guid eventId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.Query()
            .Include(e => e.TicketTypes)
            .Include(e => e.Organizer)
            .ThenInclude(o => o.Profile)
            .FirstAsync(e => e.Id == eventId, ct);

        var organizerName = eventEntity.Organizer.Profile != null
            ? eventEntity.Organizer.Profile.FullName
            : eventEntity.Organizer.Email;

        return new EventDetailResponse(
            eventEntity.Id,
            eventEntity.Slug,
            eventEntity.Title,
            eventEntity.Description,
            eventEntity.StartAt,
            eventEntity.EndAt,
            eventEntity.Venue,
            eventEntity.Status.ToString(),
            eventEntity.ImageUrl,
            eventEntity.OrganizerId,
            organizerName,
            eventEntity.TicketTypes.Select(tt => new TicketTypeResponse(
                tt.Id,
                tt.Name,
                "",
                tt.Price,
                tt.Quota,
                tt.SoldCount,
                tt.Quota - tt.SoldCount,
                10
            )).ToList(),
            eventEntity.CreatedAt
        );
    }

    private static EventListItemResponse MapToListItemResponse(Event e)
    {
        var minPrice = e.TicketTypes.Count > 0 ? e.TicketTypes.Min(tt => tt.Price) : 0;
        var totalTickets = e.TicketTypes.Sum(tt => tt.Quota);
        var availableTickets = e.TicketTypes.Sum(tt => tt.Quota - tt.SoldCount);

        return new EventListItemResponse(
            e.Id,
            e.Slug,
            e.Title,
            e.Description,
            e.StartAt,
            e.EndAt,
            e.Venue,
            e.ImageUrl,
            e.Status.ToString(),
            totalTickets,
            availableTickets,
            minPrice
        );
    }

    private async Task InvalidateEventCacheAsync(string slug, Guid eventId, CancellationToken ct)
    {
        try
        {
            var db = _redis.GetDatabase();
            await db.KeyDeleteAsync(CacheKeys.EventBySlug(slug));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate event cache");
        }
    }

    private async Task<T?> GetFromCacheAsync<T>(string key) where T : class
    {
        try
        {
            var db = _redis.GetDatabase();
            var value = await db.StringGetAsync(key);
            return value.HasValue ? System.Text.Json.JsonSerializer.Deserialize<T>(value) : null;
        }
        catch
        {
            return null;
        }
    }

    private async Task SetCacheAsync<T>(string key, T value, TimeSpan ttl) where T : class
    {
        try
        {
            var db = _redis.GetDatabase();
            var json = System.Text.Json.JsonSerializer.Serialize(value);
            await db.StringSetAsync(key, json, ttl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set cache");
        }
    }
}
