using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
public class CollaboratorController : ApiControllerBase
{
    private readonly ICollaboratorService _collaboratorService;

    public CollaboratorController(ICollaboratorService collaboratorService)
    {
        _collaboratorService = collaboratorService;
    }

    [HttpGet("api/events/{eventId:guid}/collaborators")]
    public async Task<IActionResult> GetEventCollaborators(Guid eventId, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.GetEventCollaboratorsAsync(userId, eventId, ct));
    }

    [HttpPost("api/events/{eventId:guid}/collaborators/invite")]
    public async Task<IActionResult> InviteByEmail(Guid eventId, [FromBody] InviteCollaboratorRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.InviteByEmailAsync(userId, eventId, request, ct));
    }

    [HttpPost("api/events/{eventId:guid}/collaborators/invite-link")]
    public async Task<IActionResult> GenerateInviteLink(Guid eventId, [FromBody] GenerateInviteLinkRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.GenerateInviteLinkAsync(userId, eventId, request, ct));
    }

    [HttpPut("api/events/{eventId:guid}/collaborators/{collaboratorId}")]
    public async Task<IActionResult> UpdatePermission(Guid eventId, string collaboratorId, [FromBody] UpdateCollaboratorRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.UpdatePermissionAsync(userId, eventId, collaboratorId, request, ct));
    }

    [HttpDelete("api/events/{eventId:guid}/collaborators/{collaboratorId}")]
    public async Task<IActionResult> RemoveCollaborator(Guid eventId, string collaboratorId, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.RemoveCollaboratorAsync(userId, eventId, collaboratorId, ct));
    }

    [HttpGet("api/collaborators/my")]
    public async Task<IActionResult> GetMyCollaborations(CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.GetMyCollaborationsAsync(userId, ct));
    }

    [HttpPost("api/collaborators/accept")]
    public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.AcceptInviteAsync(userId, request.Token, ct));
    }

    [HttpPost("api/collaborators/decline")]
    public async Task<IActionResult> DeclineInvite([FromBody] AcceptInviteRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _collaboratorService.DeclineInviteAsync(userId, request.Token, ct));
    }
}
