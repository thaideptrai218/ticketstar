using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;

namespace TicketStar.Application.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        IConfiguration config)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _config = config;
    }

    public async Task<TokenResponse> GoogleLoginAsync(string idToken)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = [_config["Google:ClientId"]!]
        };
        var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

        var user = await UserHelper.EnsureUserAsync(
            _userManager, payload.Email, payload.Name ?? "", payload.Picture);

        return await _tokenService.GenerateTokenPairAsync(user);
    }
}
