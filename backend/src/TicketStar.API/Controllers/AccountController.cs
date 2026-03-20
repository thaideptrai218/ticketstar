using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketStar.API.Models;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/account")]
public class AccountController : ApiControllerBase
{
    private readonly IOrganizerProfileService _organizerProfileService;
    private readonly ICollaboratorService _collaboratorService;
    private readonly IOrganizerCollaboratorService _orgCollaboratorService;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;

    public AccountController(
        IOrganizerProfileService organizerProfileService,
        ICollaboratorService collaboratorService,
        IOrganizerCollaboratorService orgCollaboratorService,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork)
    {
        _organizerProfileService = organizerProfileService;
        _collaboratorService = collaboratorService;
        _orgCollaboratorService = orgCollaboratorService;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
    }

    // ─── User profile (fullName / phone / avatarUrl) ──────────────────────────

    /// <summary>Get the current user's personal profile.</summary>
    [HttpGet("~/api/users/me/profile")]
    public async Task<IActionResult> GetUserProfile(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var user = await _userRepo.Query()
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null) return NotFound();

        var profile = user.Profile;
        var response = new UserProfileResponse(
            profile?.FullName ?? "",
            profile?.Phone,
            profile?.AvatarUrl);

        return Ok(ApiResponse<UserProfileResponse>.Ok(response, HttpContext.TraceIdentifier));
    }

    /// <summary>Update the current user's personal profile.</summary>
    [HttpPut("~/api/users/me/profile")]
    public async Task<IActionResult> UpdateUserProfile([FromBody] UpdateUserProfileRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var user = await _userRepo.Query()
            .Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null) return NotFound();

        if (user.Profile is null)
        {
            // New entity attached to a tracked user — EF Core change tracker marks it as Added automatically
            user.Profile = new UserProfile { UserId = userId };
        }

        user.Profile.FullName = request.FullName;
        user.Profile.Phone = request.Phone;
        user.Profile.AvatarUrl = request.AvatarUrl;
        user.Profile.UpdatedAt = DateTime.UtcNow;

        // Do NOT call _userRepo.Update(user) here — DbSet.Update() would mark the newly-created
        // UserProfile as Modified (not Added), resulting in a silent UPDATE on a non-existent row.
        // EF Core change tracking already handles both insert (new profile) and update (existing profile).
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(ApiResponse<UserProfileResponse>.Ok(
            new UserProfileResponse(user.Profile.FullName, user.Profile.Phone, user.Profile.AvatarUrl),
            HttpContext.TraceIdentifier));
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

    // ─── Organizer-level collaborators ────────────────────────────────────────

    /// <summary>Invite a user to collaborate on an organizer profile (organization).</summary>
    [HttpPost("organizer-profiles/{profileId}/collaborators")]
    public async Task<IActionResult> InviteOrgCollaborator(string profileId, [FromBody] InviteOrgCollaboratorRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return FromResult(await _orgCollaboratorService.InviteByEmailAsync(userId, profileId, request, ct));
    }

    /// <summary>List collaborators of an organizer profile.</summary>
    [HttpGet("organizer-profiles/{profileId}/collaborators")]
    public async Task<IActionResult> GetOrgCollaborators(string profileId, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return FromResult(await _orgCollaboratorService.GetCollaboratorsAsync(userId, profileId, ct));
    }

    /// <summary>Update permission of an organizer collaborator.</summary>
    [HttpPut("organizer-profiles/{profileId}/collaborators/{collaboratorId}")]
    public async Task<IActionResult> UpdateOrgCollaborator(string profileId, string collaboratorId, [FromBody] UpdateOrgCollaboratorRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return FromResult(await _orgCollaboratorService.UpdatePermissionAsync(userId, profileId, collaboratorId, request, ct));
    }

    /// <summary>Remove a collaborator from an organizer profile.</summary>
    [HttpDelete("organizer-profiles/{profileId}/collaborators/{collaboratorId}")]
    public async Task<IActionResult> RemoveOrgCollaborator(string profileId, string collaboratorId, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return FromResult(await _orgCollaboratorService.RemoveCollaboratorAsync(userId, profileId, collaboratorId, ct));
    }

    /// <summary>Accept an org collaborator invite via token.</summary>
    [HttpPost("org-invites/{token}/accept")]
    public async Task<IActionResult> AcceptOrgInvite(string token, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return FromResult(await _orgCollaboratorService.AcceptInviteAsync(userId, token, ct));
    }

    /// <summary>Decline an org collaborator invite via token.</summary>
    [HttpPost("org-invites/{token}/decline")]
    public async Task<IActionResult> DeclineOrgInvite(string token, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return FromResult(await _orgCollaboratorService.DeclineInviteAsync(userId, token, ct));
    }

    /// <summary>Get all org collaborator invites (pending + accepted) for the current user.</summary>
    [HttpGet("org-invites")]
    public async Task<IActionResult> GetMyOrgInvites(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return FromResult(await _orgCollaboratorService.GetMyOrgInvitesAsync(userId, ct));
    }
}
