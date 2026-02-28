using System.ComponentModel.DataAnnotations;

namespace TicketStar.Application.DTOs.Auth;

// Requests
public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8), MaxLength(128)] string Password,
    [Required] string FullName);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required, MaxLength(128)] string Password);

public record GoogleLoginRequest([Required, MaxLength(2048)] string IdToken);

public record MagicLinkRequest([Required, EmailAddress] string Email);

public record MagicLinkVerifyRequest([Required, MaxLength(512)] string Token);

public record RefreshRequest([Required, MaxLength(512)] string RefreshToken);

// Responses
public record TokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    string SessionId);

/// <summary>
/// Sent to the client in the response body — refresh token is NOT included here,
/// it is set as an HttpOnly cookie by the controller.
/// </summary>
public record AccessTokenResponse(
    string AccessToken,
    DateTime ExpiresAt,
    string SessionId);

// MFA DTOs
public record MfaSetupResponse(string Secret, string QrCodeUri, string QrCodeBase64);
public record MfaVerifySetupRequest([Required] string Code);
public record MfaChallengeRequest([Required] string MfaToken, [Required] string Code);
public record MfaChallengeResponse(string MfaToken, bool MfaRequired = true);
public record MfaRecoveryCodesResponse(List<string> RecoveryCodes);
public record MfaDisableRequest([Required] string Code);

/// <summary>
/// Discriminated union returned by Login/GoogleLogin/VerifyMagicLink.
/// Either Tokens (fully authenticated) or MfaChallenge (second factor required).
/// </summary>
public record AuthResponse
{
    public TokenResponse? Tokens { get; init; }
    public MfaChallengeResponse? MfaChallenge { get; init; }
    public bool RequiresMfa => MfaChallenge is not null;

    public static AuthResponse WithTokens(TokenResponse tokens) => new() { Tokens = tokens };
    public static AuthResponse WithMfaChallenge(MfaChallengeResponse mfa) => new() { MfaChallenge = mfa };
}
