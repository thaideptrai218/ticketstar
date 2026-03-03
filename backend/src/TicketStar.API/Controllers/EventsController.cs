using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Events;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly IEventService _eventService;

    public EventsController(IEventService eventService)
    {
        _eventService = eventService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> ListEvents([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var request = new PaginatedRequest { Page = page, PageSize = pageSize };
        var result = await _eventService.ListEventsAsync(request, ct);

        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEvent(Guid id, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _eventService.GetEventByIdAsync(id, userId, ct);

        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEventBySlug(string slug, CancellationToken ct)
    {
        var result = await _eventService.GetEventBySlugAsync(slug, ct);

        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpGet("organizer/my-events")]
    public async Task<IActionResult> GetMyEvents(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _eventService.GetOrganizerEventsAsync(userId, ct);

        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _eventService.CreateEventAsync(userId, request, ct);

        return result.IsSuccess ? CreatedAtAction(nameof(GetEvent), new { id = result.Value.Id }, result.Value) : BadRequest(result.Error);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _eventService.UpdateEventAsync(userId, id, request, ct);

        return result.IsSuccess ? Ok(result.Value) : result.ErrorType == ResultError.NotFound ? NotFound(result.Error) : BadRequest(result.Error);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _eventService.DeleteEventAsync(userId, id, ct);

        return result.IsSuccess ? Ok() : BadRequest(result.Error);
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> PublishEvent(Guid id, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        var result = await _eventService.PublishEventAsync(userId, id, ct);

        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
