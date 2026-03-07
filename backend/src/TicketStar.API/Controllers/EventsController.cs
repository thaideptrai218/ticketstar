using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Events;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/events")]
public class EventsController : ApiControllerBase
{
    private readonly IEventService _eventService;

    public EventsController(IEventService eventService)
    {
        _eventService = eventService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> ListEvents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? filter = null,
        [FromQuery] string? search = null,
        [FromQuery] string? location = null,
        [FromQuery] string? category = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        CancellationToken ct = default)
    {
        var request = new PaginatedRequest
        {
            Page = Math.Max(1, page),
            PageSize = Math.Clamp(pageSize, 1, 100),
            Filter = filter,
            Search = search,
            Location = location,
            Category = category,
            DateFrom = dateFrom,
            DateTo = dateTo
        };
        return FromResult(await _eventService.ListEventsAsync(request, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEvent(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _eventService.GetEventByIdAsync(id, userId, ct));
    }

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEventBySlug(string slug, CancellationToken ct)
    {
        return FromResult(await _eventService.GetEventBySlugAsync(slug, ct));
    }

    [HttpGet("organizer/my-events")]
    public async Task<IActionResult> GetMyEvents(CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _eventService.GetOrganizerEventsAsync(userId, ct));
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        var result = await _eventService.CreateEventAsync(userId, request, ct);
        return CreatedFromResult(result, nameof(GetEvent), result.IsSuccess ? new { id = result.Value!.Id } : null);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _eventService.UpdateEventAsync(userId, id, request, ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _eventService.DeleteEventAsync(userId, id, ct));
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> PublishEvent(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _eventService.PublishEventAsync(userId, id, ct));
    }

    [HttpPost("{id:guid}/unpublish")]
    public async Task<IActionResult> UnpublishEvent(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _eventService.UnpublishEventAsync(userId, id, ct));
    }
}
