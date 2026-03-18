namespace TicketStar.Application.DTOs;

public record CreateOrganizerProfileRequest(
    string OrganizationName,
    string? Description,
    string? Phone,
    string? Address,
    string? Website,
    string? FacebookUrl,
    string? InstagramUrl);

public record UpdateOrganizerProfileRequest(
    string OrganizationName,
    string? Description,
    string? Phone,
    string? Address,
    string? Website,
    string? FacebookUrl,
    string? InstagramUrl);

public record OrganizerProfileResponse(
    string Id,
    string UserId,
    string OrganizationName,
    string? Description,
    string? LogoUrl,
    string? Phone,
    string? Address,
    string? Website,
    string? FacebookUrl,
    string? InstagramUrl,
    bool IsVerified,
    DateTime CreatedAt);
