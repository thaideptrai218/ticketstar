using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/payout")]
public class PayoutController : ApiControllerBase
{
    private readonly IPayoutService _payoutService;

    public PayoutController(IPayoutService payoutService)
    {
        _payoutService = payoutService;
    }

    [HttpGet("events/{eventId:guid}")]
    public async Task<IActionResult> GetEventPayout(Guid eventId, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _payoutService.GetEventPayoutAsync(userId, eventId, ct));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetPayoutSummary(CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _payoutService.GetOrganizerPayoutSummaryAsync(userId, ct));
    }
}
