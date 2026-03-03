using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
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

    /// <summary>Sends OTP to user's email to initiate MFA setup.</summary>
    [Authorize]
    [HttpPost("setup")]
    public async Task<IActionResult> Setup()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _mfaService.SetupAsync(userId);
        return FromResult(result);
    }

    /// <summary>Confirms MFA setup by validating the email OTP. Enables MFA.</summary>
    [Authorize]
    [HttpPost("verify-setup")]
    public async Task<IActionResult> VerifySetup([FromBody] MfaVerifySetupRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _mfaService.VerifySetupAsync(userId, request.Code);
        return FromResult(result, "MFA enabled successfully.");
    }

    /// <summary>Sends OTP to email for MFA challenge during login.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("challenge/send")]
    public async Task<IActionResult> ChallengeSend([FromBody] MfaSendOtpRequest request)
    {
        var result = await _mfaService.SendChallengeOtpAsync(request.MfaToken);
        return FromResult(result, "OTP sent to your email.");
    }

    /// <summary>Verifies OTP for MFA challenge, returns tokens on success.</summary>
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("challenge/verify")]
    public async Task<IActionResult> ChallengeVerify([FromBody] MfaChallengeRequest request)
    {
        var result = await _mfaService.VerifyChallengeAsync(
            request.MfaToken, request.Code, GetIp(), GetUserAgent());

        if (!result.IsSuccess)
            return FromResult(result);

        var tokens = result.Value!;
        Response.SetRefreshTokenCookie(tokens.RefreshToken, _jwtOptions.RefreshTokenDays, IsHttps);
        var body = new AccessTokenResponse(tokens.AccessToken, tokens.ExpiresAt, tokens.SessionId);
        return Ok(ApiResponse<AccessTokenResponse>.Ok(body, HttpContext.TraceIdentifier));
    }

    /// <summary>Sends OTP to email for MFA disable confirmation.</summary>
    [Authorize]
    [HttpPost("disable/send")]
    public async Task<IActionResult> DisableSend()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _mfaService.SendDisableOtpAsync(userId);
        return FromResult(result, "OTP sent to your email.");
    }

    /// <summary>Disables MFA after validating OTP code.</summary>
    [Authorize]
    [HttpPost("disable")]
    public async Task<IActionResult> Disable([FromBody] MfaDisableRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await _mfaService.DisableAsync(userId, request.Code);
        return FromResult(result, "MFA disabled successfully.");
    }

    /// <summary>Returns current MFA status for the authenticated user.</summary>
    [Authorize]
    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var status = await _mfaService.GetStatusAsync(userId);
        return Ok(ApiResponse<MfaStatusResponse>.Ok(status, HttpContext.TraceIdentifier));
    }
}
