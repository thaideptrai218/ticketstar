using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QRCoder;
using TicketStar.API.Models;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Route("api/auth/mfa")]
public class MfaController : ApiControllerBase
{
    private readonly IMfaService _mfaService;

    public MfaController(IMfaService mfaService)
    {
        _mfaService = mfaService;
    }

    /// <summary>
    /// Generates a TOTP secret and QR code for the authenticated user.
    /// Does NOT enable MFA — call verify-setup to confirm.
    /// </summary>
    [Authorize]
    [HttpPost("setup")]
    public async Task<IActionResult> Setup()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _mfaService.GenerateSetupAsync(userId);

        // Render QR code in the API layer (QRCoder lives here, not in Application)
        var qrBase64 = RenderQrCode(result.QrCodeUri);
        var response = result with { QrCodeBase64 = qrBase64 };
        return Ok(ApiResponse<MfaSetupResponse>.Ok(response, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Confirms MFA setup by validating a TOTP code. Enables MFA and returns recovery codes.
    /// </summary>
    [Authorize]
    [HttpPost("verify-setup")]
    public async Task<IActionResult> VerifySetup([FromBody] MfaVerifySetupRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _mfaService.VerifySetupAsync(userId, request.Code);
        return FromResult(result);
    }

    /// <summary>
    /// Completes MFA login: validates mfaToken + TOTP/recovery code, returns full token pair.
    /// AllowAnonymous — user is not yet fully authenticated at this point.
    /// </summary>
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("challenge")]
    public async Task<IActionResult> Challenge([FromBody] MfaChallengeRequest request)
    {
        var result = await _mfaService.VerifyChallengeAsync(
            request.MfaToken, request.Code, GetIp(), GetUserAgent());

        if (!result.IsSuccess)
            return FromResult(result);

        // Challenge completes MFA — return the full token. The client should store the
        // refresh token securely; ideally wire this through a shared cookie-setting helper.
        return Ok(ApiResponse<TokenResponse>.Ok(result.Value!, HttpContext.TraceIdentifier));
    }

    /// <summary>
    /// Disables MFA. Requires a valid TOTP code or recovery code.
    /// </summary>
    [Authorize]
    [HttpPost("disable")]
    public async Task<IActionResult> Disable([FromBody] MfaDisableRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _mfaService.DisableAsync(userId, request.Code);
        return FromResult(result, "MFA disabled successfully.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string? GetUserId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

    private string? GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString();
    private string? GetUserAgent() => Request.Headers.UserAgent.ToString();

    private static string RenderQrCode(string content)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new PngByteQRCode(data);
        var bytes = qrCode.GetGraphic(4);
        return Convert.ToBase64String(bytes);
    }
}
