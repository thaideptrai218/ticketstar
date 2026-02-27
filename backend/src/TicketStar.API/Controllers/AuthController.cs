using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;
    private readonly ITokenService _tokenService;

    public AuthController(IAuthService authService, ITokenService tokenService)
    {
        _authService = authService;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        => CreatedFromResult(await _authService.RegisterAsync(request, GetIp(), GetUserAgent()));

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
        => FromResult(await _authService.LoginAsync(request, GetIp(), GetUserAgent()));

    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        => FromResult(await _authService.GoogleLoginAsync(request.IdToken, GetIp(), GetUserAgent()));

    [EnableRateLimiting("magic-link")]
    [HttpPost("magic-link/request")]
    public async Task<IActionResult> RequestMagicLink([FromBody] MagicLinkRequest request)
        => FromResult(await _authService.RequestMagicLinkAsync(request.Email, GetIp()),
            "If the email exists, a magic link has been sent.");

    [HttpPost("magic-link/verify")]
    public async Task<IActionResult> VerifyMagicLink([FromBody] MagicLinkVerifyRequest request)
        => FromResult(await _authService.VerifyMagicLinkAsync(request.Token, GetIp(), GetUserAgent()));

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
        => FromResult(await _tokenService.RefreshTokenAsync(request.RefreshToken));

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
        => FromResult(await _authService.LogoutAsync(request.RefreshToken), "Logged out successfully.");

    [Authorize]
    [HttpPost("revoke-all")]
    public async Task<IActionResult> RevokeAllSessions()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (userId is null) return Unauthorized();

        return FromResult(await _authService.RevokeAllSessionsAsync(userId), "All sessions revoked.");
    }

    private string? GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString();
    private string? GetUserAgent() => Request.Headers.UserAgent.ToString();
}
