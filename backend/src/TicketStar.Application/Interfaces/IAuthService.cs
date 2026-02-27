using TicketStar.Application.DTOs.Auth;

namespace TicketStar.Application.Interfaces;

public interface IAuthService
{
    Task<TokenResponse> RegisterAsync(RegisterRequest request, string? ipAddress, string? userAgent);
    Task<TokenResponse> LoginAsync(LoginRequest request, string? ipAddress, string? userAgent);
    Task<TokenResponse> GoogleLoginAsync(string idToken, string? ipAddress, string? userAgent);
    Task RequestMagicLinkAsync(string email, string? ipAddress);
    Task<TokenResponse> VerifyMagicLinkAsync(string token, string? ipAddress, string? userAgent);
    Task LogoutAsync(string refreshToken);
    Task RevokeAllSessionsAsync(string userId);
}
