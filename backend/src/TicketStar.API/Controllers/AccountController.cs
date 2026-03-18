using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.API.Models;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/account")]
public class AccountController : ApiControllerBase
{
    private readonly IOrganizerProfileService _organizerProfileService;
    private readonly ICollaboratorService _collaboratorService;

    public AccountController(IOrganizerProfileService organizerProfileService, ICollaboratorService collaboratorService)
    {
        _organizerProfileService = organizerProfileService;
        _collaboratorService = collaboratorService;
    }

    /// <summary>
    /// Create organizer profile (first or additional organization).
    /// </summary>
    [HttpPost("become-organizer")]
    public async Task<IActionResult> BecomeOrganizer([FromBody] CreateOrganizerProfileRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        return FromResult(await _organizerProfileService.CreateAsync(userId, request, ct));
    }

    /// <summary>
    /// Get all organizer profiles belonging to the current user.
    /// </summary>
    [HttpGet("organizer-profiles")]
    public async Task<IActionResult> GetOrganizerProfiles(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var profiles = await _organizerProfileService.GetAllByUserIdAsync(userId, ct);
        return Ok(ApiResponse<List<OrganizerProfileResponse>>.Ok(profiles, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Get the first (primary) organizer profile — kept for backwards compatibility.
    /// </summary>
    [HttpGet("organizer-profile")]
    public async Task<IActionResult> GetOrganizerProfile(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var profile = await _organizerProfileService.GetByUserIdAsync(userId, ct);
        if (profile == null) return NotFound();
        return Ok(ApiResponse<OrganizerProfileResponse>.Ok(profile, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Update a specific organizer profile by ID (must belong to current user).
    /// </summary>
    [HttpPut("organizer-profiles/{id}")]
    public async Task<IActionResult> UpdateOrganizerProfileById(string id, [FromBody] UpdateOrganizerProfileRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        return FromResult(await _organizerProfileService.UpdateByIdAsync(userId, id, request, ct));
    }

    /// <summary>
    /// Get distinct organizer profiles from events the user is an accepted collaborator on.
    /// </summary>
    [HttpGet("collaborator-orgs")]
    public async Task<IActionResult> GetCollaboratorOrgs(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        return FromResult(await _collaboratorService.GetMyCollaboratorOrgsAsync(userId, ct));
    }

    /// <summary>
    /// Update the primary organizer profile — kept for backwards compatibility.
    /// </summary>
    [HttpPut("organizer-profile")]
    public async Task<IActionResult> UpdateOrganizerProfile([FromBody] UpdateOrganizerProfileRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        return FromResult(await _organizerProfileService.UpdateAsync(userId, request, ct));
    }
}
