using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;

namespace TicketStar.Application.Interfaces;

public interface IMfaService
{
    /// <summary>Sends a 6-digit OTP to the user's email. Does NOT enable MFA yet.</summary>
    Task<Result<MfaSetupResponse>> SetupAsync(string userId);

    /// <summary>Validates OTP to confirm setup. Enables MFA on success.</summary>
    Task<Result> VerifySetupAsync(string userId, string code);

    /// <summary>Sends OTP to email for MFA challenge during login.</summary>
    Task<Result> SendChallengeOtpAsync(string mfaToken);

    /// <summary>Validates mfaToken + OTP code, issues full token pair on success.</summary>
    Task<Result<TokenResponse>> VerifyChallengeAsync(string mfaToken, string code, string? ip, string? ua);

    /// <summary>Sends OTP to email for MFA disable confirmation.</summary>
    Task<Result> SendDisableOtpAsync(string userId);

    /// <summary>Disables MFA after validating OTP code.</summary>
    Task<Result> DisableAsync(string userId, string code);

    /// <summary>Returns current MFA status for the user.</summary>
    Task<MfaStatusResponse> GetStatusAsync(string userId);

    /// <summary>Generates a short-lived (5min) JWT used as the MFA challenge token.</summary>
    string GenerateMfaToken(string userId);

    /// <summary>Validates the MFA token and returns the userId claim, or null if invalid.</summary>
    string? ValidateMfaToken(string mfaToken);
}
