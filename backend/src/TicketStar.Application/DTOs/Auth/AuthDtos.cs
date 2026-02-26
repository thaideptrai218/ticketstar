using System.ComponentModel.DataAnnotations;

namespace TicketStar.Application.DTOs.Auth;

public record GoogleLoginRequest([Required] string IdToken);

public record MagicLinkRequest([Required, EmailAddress] string Email);

public record MagicLinkVerifyRequest([Required] string Token);

public record RefreshRequest([Required] string RefreshToken);

public record TokenResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt);
