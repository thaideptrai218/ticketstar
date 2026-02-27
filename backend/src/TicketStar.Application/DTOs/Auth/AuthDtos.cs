using System.ComponentModel.DataAnnotations;

namespace TicketStar.Application.DTOs.Auth;

// Requests
public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string FullName);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record GoogleLoginRequest([Required] string IdToken);

public record MagicLinkRequest([Required, EmailAddress] string Email);

public record MagicLinkVerifyRequest([Required] string Token);

public record RefreshRequest([Required] string RefreshToken);

// Responses
public record TokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    string SessionId);
