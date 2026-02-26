using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Application.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

    public TokenService(IConfiguration config, UserManager<ApplicationUser> userManager, AppDbContext db)
    {
        _config = config;
        _userManager = userManager;
        _db = db;
    }

    public async Task<TokenResponse> GenerateTokenPairAsync(ApplicationUser user)
    {
        var accessToken = await GenerateAccessTokenAsync(user);
        var refreshToken = GenerateRefreshTokenString();
        var hashedToken = HashToken(refreshToken);

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = hashedToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync();

        var expiryMinutes = _config.GetValue("Jwt:ExpiryMinutes", 15);
        return new TokenResponse(accessToken, refreshToken, DateTime.UtcNow.AddMinutes(expiryMinutes));
    }

    public async Task<TokenResponse> RefreshTokenAsync(string refreshToken)
    {
        var hashedToken = HashToken(refreshToken);
        var stored = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == hashedToken);

        if (stored is null)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        // Reuse detection: if token is already revoked, revoke all user tokens
        if (stored.IsRevoked)
        {
            await RevokeAllUserTokensAsync(stored.UserId);
            throw new UnauthorizedAccessException("Token reuse detected. All sessions revoked.");
        }

        if (stored.IsExpired)
            throw new UnauthorizedAccessException("Refresh token expired.");

        // Rotate: revoke old, issue new
        var newRefreshString = GenerateRefreshTokenString();
        var newHashedToken = HashToken(newRefreshString);

        stored.RevokedAt = DateTime.UtcNow;
        stored.ReplacedByToken = newHashedToken;

        var newEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = stored.UserId,
            Token = newHashedToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        _db.RefreshTokens.Add(newEntity);
        await _db.SaveChangesAsync();

        var accessToken = await GenerateAccessTokenAsync(stored.User);
        var expiryMinutes = _config.GetValue("Jwt:ExpiryMinutes", 15);
        return new TokenResponse(accessToken, newRefreshString, DateTime.UtcNow.AddMinutes(expiryMinutes));
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var hashedToken = HashToken(refreshToken);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == hashedToken);
        if (stored is not null && stored.IsActive)
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    private async Task<string> GenerateAccessTokenAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("fullName", user.FullName)
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiryMinutes = _config.GetValue("Jwt:ExpiryMinutes", 15);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshTokenString()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    private async Task RevokeAllUserTokensAsync(string userId)
    {
        var activeTokens = await _db.RefreshTokens
            .Where(r => r.UserId == userId && r.RevokedAt == null)
            .ToListAsync();

        foreach (var t in activeTokens)
            t.RevokedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }
}
