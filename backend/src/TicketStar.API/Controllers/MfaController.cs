using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using QRCoder;
using TicketStar.API.Extensions;
using TicketStar.API.Models;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;

namespace TicketStar.API.Controllers;

[Route("api/auth/mfa")]
public class MfaController : ApiControllerBase
{
    private readonly IMfaService _mfaService;
    private readonly JwtOptions _jwtOptions;

    public MfaController(IMfaService mfaService, IOptions<JwtOptions> jwtOptions)
    {
        _mfaService = mfaService;
        _jwtOptions = jwtOptions.Value;
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

        // Set refresh token as HttpOnly cookie, return only access token in body.
        var tokens = result.Value!;
        Response.SetRefreshTokenCookie(tokens.RefreshToken, _jwtOptions.RefreshTokenDays, IsHttps);
        var body = new AccessTokenResponse(tokens.AccessToken, tokens.ExpiresAt, tokens.SessionId);
        return Ok(ApiResponse<AccessTokenResponse>.Ok(body, HttpContext.TraceIdentifier));
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

    private static string RenderQrCode(string content)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(content, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new PngByteQRCode(data);
        var bytes = qrCode.GetGraphic(4);
        return Convert.ToBase64String(bytes);
    }
}
