using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/account")]
public class AccountController : ApiControllerBase
{
    private readonly IOrganizerProfileService _organizerProfileService;

    public AccountController(IOrganizerProfileService organizerProfileService)
    {
        _organizerProfileService = organizerProfileService;
    }

    /// <summary>
    /// Self-service: create organizer profile to enable event creation.
    /// </summary>
    [HttpPost("become-organizer")]
    public async Task<IActionResult> BecomeOrganizer([FromBody] CreateOrganizerProfileRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        return FromResult(await _organizerProfileService.CreateAsync(userId, request, ct));
    }

    [HttpGet("organizer-profile")]
    public async Task<IActionResult> GetOrganizerProfile(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        var profile = await _organizerProfileService.GetByUserIdAsync(userId, ct);
        return profile == null ? NotFound() : Ok(profile);
    }

    [HttpPut("organizer-profile")]
    public async Task<IActionResult> UpdateOrganizerProfile([FromBody] UpdateOrganizerProfileRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        return FromResult(await _organizerProfileService.UpdateAsync(userId, request, ct));
    }
}
