using TicketStar.Application.Common;
using TicketStar.Application.DTOs;

namespace TicketStar.Application.Interfaces;

public interface IOrganizerCollaboratorService
{
    Task<Result<OrgCollaboratorResponse>> InviteByEmailAsync(string ownerId, string profileId, InviteOrgCollaboratorRequest request, CancellationToken ct);
    Task<Result<List<OrgCollaboratorResponse>>> GetCollaboratorsAsync(string ownerId, string profileId, CancellationToken ct);
    Task<Result<OrgCollaboratorResponse>> UpdatePermissionAsync(string ownerId, string profileId, string collaboratorId, UpdateOrgCollaboratorRequest request, CancellationToken ct);
    Task<Result<bool>> RemoveCollaboratorAsync(string ownerId, string profileId, string collaboratorId, CancellationToken ct);
    Task<Result<OrgCollaboratorResponse>> AcceptInviteAsync(string userId, string token, CancellationToken ct);
    Task<Result<bool>> DeclineInviteAsync(string userId, string token, CancellationToken ct);
    Task<Result<List<OrgCollaboratorResponse>>> GetMyOrgInvitesAsync(string userId, CancellationToken ct);
    Task BackfillUserIdAsync(string userId, string email, CancellationToken ct);
}
