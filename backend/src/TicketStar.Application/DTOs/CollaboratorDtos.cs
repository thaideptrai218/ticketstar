namespace TicketStar.Application.DTOs;

public record InviteCollaboratorRequest(string Email, string PermissionLevel);

public record GenerateInviteLinkRequest(string PermissionLevel);

public record UpdateCollaboratorRequest(string PermissionLevel);

public record AcceptInviteRequest(string Token);

public record CollaboratorResponse(
    string Id,
    string? UserId,
    string Email,
    string? FullName,
    string PermissionLevel,
    string Status,
    DateTime InvitedAt,
    DateTime? AcceptedAt);

public record InviteLinkResponse(string Token, string InviteLink, DateTime ExpiresAt);

public record CollaborationEventResponse(
    Guid EventId,
    string Title,
    string? Venue,
    DateTime StartAt,
    DateTime EndAt,
    string Status,
    string PermissionLevel,
    string CollaboratorStatus,
    string? InviteToken);  // populated for Pending invites so frontend can accept/decline inline
