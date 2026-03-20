namespace TicketStar.Application.DTOs;

public record InviteOrgCollaboratorRequest(string Email, string PermissionLevel);
public record UpdateOrgCollaboratorRequest(string PermissionLevel);

public record OrgCollaboratorResponse(
    string Id,
    string? UserId,
    string Email,
    string? FullName,
    string PermissionLevel,
    string Status,
    DateTime InvitedAt,
    DateTime? AcceptedAt,
    string? InviteToken = null,
    string? OrganizerProfileId = null,
    string? OrganizationName = null);
