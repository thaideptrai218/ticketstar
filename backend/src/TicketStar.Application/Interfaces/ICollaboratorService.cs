using TicketStar.Application.Common;
using TicketStar.Application.DTOs;

namespace TicketStar.Application.Interfaces;

public interface ICollaboratorService
{
    Task<Result<CollaboratorResponse>> InviteByEmailAsync(string organizerId, Guid eventId, InviteCollaboratorRequest request, CancellationToken ct);
    Task<Result<InviteLinkResponse>> GenerateInviteLinkAsync(string organizerId, Guid eventId, GenerateInviteLinkRequest request, CancellationToken ct);
    Task<Result<CollaboratorResponse>> AcceptInviteAsync(string userId, string token, CancellationToken ct);
    Task<Result<bool>> DeclineInviteAsync(string userId, string token, CancellationToken ct);
    Task<Result<CollaboratorResponse>> UpdatePermissionAsync(string organizerId, Guid eventId, string collaboratorId, UpdateCollaboratorRequest request, CancellationToken ct);
    Task<Result<bool>> RemoveCollaboratorAsync(string organizerId, Guid eventId, string collaboratorId, CancellationToken ct);
    Task<Result<List<CollaboratorResponse>>> GetEventCollaboratorsAsync(string userId, Guid eventId, CancellationToken ct);
    Task<Result<List<CollaborationEventResponse>>> GetMyCollaborationsAsync(string userId, CancellationToken ct);
    /// <summary>Returns distinct organizer profiles from events the user has accepted collaborator invites for.</summary>
    Task<Result<List<OrganizerProfileResponse>>> GetMyCollaboratorOrgsAsync(string userId, CancellationToken ct);
    /// <summary>Called after user registration to link pre-existing pending invites to the new user account.</summary>
    Task BackfillUserIdAsync(string userId, string email, CancellationToken ct);
}
