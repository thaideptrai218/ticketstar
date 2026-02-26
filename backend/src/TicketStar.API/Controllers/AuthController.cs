using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Services;

namespace TicketStar.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ITokenService _tokenService;
    private readonly MagicLinkService _magicLinkService;

    public AuthController(IAuthService authService, ITokenService tokenService, MagicLinkService magicLinkService)
    {
        _authService = authService;
        _tokenService = tokenService;
        _magicLinkService = magicLinkService;
    }

    [HttpPost("google-login")]
    public async Task<ActionResult<TokenResponse>> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        try
        {
            var response = await _authService.GoogleLoginAsync(request.IdToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [EnableRateLimiting("magic-link")]
    [HttpPost("magic-link/request")]
    public async Task<IActionResult> RequestMagicLink([FromBody] MagicLinkRequest request)
    {
        await _magicLinkService.RequestAsync(request.Email);
        // Always return OK to prevent email enumeration
        return Ok(new { message = "If the email exists, a magic link has been sent." });
    }

    [HttpPost("magic-link/verify")]
    public async Task<ActionResult<TokenResponse>> VerifyMagicLink([FromBody] MagicLinkVerifyRequest request)
    {
        try
        {
            var response = await _magicLinkService.VerifyAsync(request.Token);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<TokenResponse>> Refresh([FromBody] RefreshRequest request)
    {
        try
        {
            var response = await _tokenService.RefreshTokenAsync(request.RefreshToken);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        await _tokenService.RevokeRefreshTokenAsync(request.RefreshToken);
        return Ok(new { message = "Logged out successfully." });
    }
}
