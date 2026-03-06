using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.DTOs.Events;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/events/{eventId:guid}/ticket-types")]
public class TicketTypesController : ApiControllerBase
{
    private readonly ITicketTypeService _ticketTypeService;

    public TicketTypesController(ITicketTypeService ticketTypeService)
    {
        _ticketTypeService = ticketTypeService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> ListTicketTypes(Guid eventId, CancellationToken ct)
    {
        return FromResult(await _ticketTypeService.ListByEventAsync(eventId, ct));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTicketType(Guid eventId, [FromBody] CreateTicketTypeRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return CreatedFromResult(await _ticketTypeService.CreateAsync(userId, eventId, request, ct));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTicketType(Guid eventId, Guid id, [FromBody] UpdateTicketTypeRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _ticketTypeService.UpdateAsync(userId, eventId, id, request, ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTicketType(Guid eventId, Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _ticketTypeService.DeleteAsync(userId, eventId, id, ct));
    }
}
