using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;

namespace TicketStar.Application.Interfaces;

public interface IMfaService
{
    /// <summary>Generates TOTP secret and QR code. Stores encrypted secret but does NOT enable MFA yet.</summary>
    Task<MfaSetupResponse> GenerateSetupAsync(string userId);

    /// <summary>Validates TOTP code to confirm setup. Enables MFA and returns plaintext recovery codes.</summary>
    Task<Result<MfaRecoveryCodesResponse>> VerifySetupAsync(string userId, string code);

    /// <summary>Validates mfaToken + TOTP/recovery code, issues full token pair on success.</summary>
    Task<Result<TokenResponse>> VerifyChallengeAsync(string mfaToken, string code, string? ip, string? ua);

    /// <summary>Disables MFA after validating TOTP code. Deletes recovery codes.</summary>
    Task<Result> DisableAsync(string userId, string code);

    /// <summary>Generates a short-lived (5min) JWT used as the MFA challenge token.</summary>
    string GenerateMfaToken(string userId);

    /// <summary>Validates the MFA token and returns the userId claim, or null if invalid.</summary>
    string? ValidateMfaToken(string mfaToken);
}
