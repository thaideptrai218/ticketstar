using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.DTOs.Tickets;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/tickets")]
public class TicketsController : ApiControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyTickets(CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _ticketService.GetMyTicketsAsync(userId, ct));
    }

    [HttpGet("{id:guid}/qr")]
    public async Task<IActionResult> GetTicketQr(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _ticketService.GetTicketQrAsync(id, userId, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTicket(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _ticketService.GetTicketByIdAsync(id, userId, ct));
    }

    [HttpPost("{id:guid}/transfer")]
    public async Task<IActionResult> TransferTicket(Guid id, [FromBody] TransferTicketRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _ticketService.TransferTicketAsync(id, userId, request, ct));
    }
}
