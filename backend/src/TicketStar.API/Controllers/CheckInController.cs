using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.DTOs.CheckIn;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/checkin")]
public class CheckInController : ApiControllerBase
{
    private readonly ICheckInService _checkInService;

    public CheckInController(ICheckInService checkInService)
    {
        _checkInService = checkInService;
    }

    [HttpPost("events/{eventId:guid}/scan")]
    public async Task<IActionResult> ScanTicket(Guid eventId, [FromBody] CheckInTicketRequest request, CancellationToken ct)
    {
        var scannerId = GetUserId() ?? "";
        return FromResult(await _checkInService.ScanTicketAsync(request.QrCode, scannerId, eventId, ct));
    }

    [HttpGet("events/{eventId:guid}/stats")]
    public async Task<IActionResult> GetEventStats(Guid eventId, CancellationToken ct)
    {
        return FromResult(await _checkInService.GetEventStatsAsync(eventId, ct));
    }

    [HttpGet("events/{eventId:guid}/checkins")]
    public async Task<IActionResult> GetEventCheckIns(Guid eventId, CancellationToken ct)
    {
        return FromResult(await _checkInService.GetEventCheckInsAsync(eventId, ct));
    }
}
