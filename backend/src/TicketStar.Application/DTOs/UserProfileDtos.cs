namespace TicketStar.Application.DTOs;

public record UserProfileResponse(
    string FullName,
    string? Phone,
    string? AvatarUrl);

public record UpdateUserProfileRequest(
    string FullName,
    string? Phone,
    string? AvatarUrl);
