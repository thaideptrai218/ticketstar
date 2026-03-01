using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using TicketStar.API.Extensions;
using TicketStar.API.Models;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;

namespace TicketStar.API.Controllers;

[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;
    private readonly ITokenService _tokenService;
    private readonly JwtOptions _jwtOptions;

    public AuthController(
        IAuthService authService,
        ITokenService tokenService,
        IOptions<JwtOptions> jwtOptions)
    {
        _authService = authService;
        _tokenService = tokenService;
        _jwtOptions = jwtOptions.Value;
    }

    [EnableRateLimiting("register")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request, GetIp(), GetUserAgent());
        return CreatedFromTokenResult(result);
    }

    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request, GetIp(), GetUserAgent());
        return FromAuthResult(result);
    }

    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        var result = await _authService.GoogleLoginAsync(request.IdToken, GetIp(), GetUserAgent());
        return FromAuthResult(result);
    }

    [EnableRateLimiting("magic-link")]
    [HttpPost("magic-link/request")]
    public async Task<IActionResult> RequestMagicLink([FromBody] MagicLinkRequest request)
        => FromResult(await _authService.RequestMagicLinkAsync(request.Email, GetIp()),
            "If the email exists, a magic link has been sent.");

    [HttpPost("magic-link/verify")]
    public async Task<IActionResult> VerifyMagicLink([FromBody] MagicLinkVerifyRequest request)
    {
        var result = await _authService.VerifyMagicLinkAsync(request.Token, GetIp(), GetUserAgent());
        return FromAuthResult(result);
    }

    [EnableRateLimiting("refresh")]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.GetRefreshTokenCookie();
        if (refreshToken is null)
            return Unauthorized();

        var result = await _tokenService.RefreshTokenAsync(refreshToken);
        return FromTokenResult(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.GetRefreshTokenCookie();

        // Validate token ownership: cookie belongs to the authenticated user
        if (refreshToken is not null)
        {
            var result = await _authService.LogoutAsync(refreshToken);
            Response.ClearRefreshTokenCookie(IsHttps);
            return FromResult(result, "Logged out successfully.");
        }

        Response.ClearRefreshTokenCookie(IsHttps);
        return FromResult(Result.Success(), "Logged out successfully.");
    }

    [Authorize]
    [HttpPost("revoke-all")]
    public async Task<IActionResult> RevokeAllSessions()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        return FromResult(await _authService.RevokeAllSessionsAsync(userId), "All sessions revoked.");
    }

    // Handles AuthResponse: sets cookie+tokens OR returns MFA challenge (no cookie)
    private IActionResult FromAuthResult(Result<AuthResponse> result)
    {
        if (!result.IsSuccess)
            return FromResult(result);

        var auth = result.Value!;
        if (auth.RequiresMfa)
            return Ok(ApiResponse<MfaChallengeResponse>.Ok(auth.MfaChallenge!, HttpContext.TraceIdentifier));

        SetTokenCookie(auth.Tokens!);
        var body = ToAccessTokenResponse(auth.Tokens!);
        return Ok(ApiResponse<AccessTokenResponse>.Ok(body, HttpContext.TraceIdentifier));
    }

    // Sets refresh token cookie and returns access token response body (no refresh token in body)
    private IActionResult FromTokenResult(Result<TokenResponse> result)
    {
        if (!result.IsSuccess)
            return FromResult(result);

        SetTokenCookie(result.Value!);
        var body = ToAccessTokenResponse(result.Value!);
        return Ok(ApiResponse<AccessTokenResponse>.Ok(body, HttpContext.TraceIdentifier));
    }

    private IActionResult CreatedFromTokenResult(Result<TokenResponse> result)
    {
        if (!result.IsSuccess)
            return FromResult(result);

        SetTokenCookie(result.Value!);
        var body = ToAccessTokenResponse(result.Value!);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<AccessTokenResponse>.Ok(body, HttpContext.TraceIdentifier));
    }

    private static AccessTokenResponse ToAccessTokenResponse(TokenResponse t)
        => new(t.AccessToken, t.ExpiresAt, t.SessionId);

    private void SetTokenCookie(TokenResponse tokens)
    {
        Response.SetRefreshTokenCookie(tokens.RefreshToken, _jwtOptions.RefreshTokenDays, IsHttps);
    }

}
