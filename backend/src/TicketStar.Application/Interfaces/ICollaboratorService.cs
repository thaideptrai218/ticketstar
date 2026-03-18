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
}
