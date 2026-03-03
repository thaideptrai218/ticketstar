using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TicketStar.Application.Interfaces;
using TicketStar.Application.DTOs.CheckIn;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/checkin")]
public class CheckInController : ControllerBase
{
    private readonly ICheckInService _checkInService;

    public CheckInController(ICheckInService checkInService)
    {
        _checkInService = checkInService;
    }

    [HttpPost("scan")]
    public async Task<IActionResult> ScanTicket([FromBody] CheckInTicketRequest request, CancellationToken ct)
    {
        var scannerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        // EventId would come from staff context or request
        // For now, we'd need to derive it from the ticket
        var result = await _checkInService.ScanTicketAsync(request.QrCode, scannerId, Guid.Empty, ct);

        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("events/{eventId:guid}/stats")]
    public async Task<IActionResult> GetEventStats(Guid eventId, CancellationToken ct)
    {
        var result = await _checkInService.GetEventStatsAsync(eventId, ct);

        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("events/{eventId:guid}/checkins")]
    public async Task<IActionResult> GetEventCheckIns(Guid eventId, CancellationToken ct)
    {
        var result = await _checkInService.GetEventCheckInsAsync(eventId, ct);

        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }
}
