using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;

namespace TicketStar.Application.Interfaces;

public interface IAuthService
{
    Task<Result<TokenResponse>> RegisterAsync(RegisterRequest request, string? ipAddress, string? userAgent);
    Task<Result<AuthResponse>> LoginAsync(LoginRequest request, string? ipAddress, string? userAgent);
    Task<Result<AuthResponse>> GoogleLoginAsync(string idToken, string? ipAddress, string? userAgent);
    Task<Result> RequestMagicLinkAsync(string email, string? ipAddress);
    Task<Result<AuthResponse>> VerifyMagicLinkAsync(string token, string? ipAddress, string? userAgent);
    Task<Result> LogoutAsync(string refreshToken);
    Task<Result> RevokeAllSessionsAsync(string userId);
}
