using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
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
    private readonly ITokenHasher _tokenHasher;
    private readonly ISecureRandom _random;
    private readonly AppDbContext _db;

    public TokenService(IConfiguration config, ITokenHasher tokenHasher, ISecureRandom random, AppDbContext db)
    {
        _config = config;
        _tokenHasher = tokenHasher;
        _random = random;
        _db = db;
    }

    public async Task<TokenResponse> GenerateTokenPairAsync(User user, AuthSession session)
    {
        var accessToken = GenerateAccessToken(user, session.Id.ToString("N"));
        var refreshPlaintext = _random.GenerateToken(64);
        var refreshHash = _tokenHasher.Hash(refreshPlaintext);

        var entity = new RefreshToken
        {
            UserId = user.Id,
            SessionId = session.Id,
            TokenHash = refreshHash,
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync();

        var expiryMinutes = _config.GetValue("Jwt:ExpiryMinutes", 15);
        return new TokenResponse(
            accessToken, refreshPlaintext,
            DateTime.UtcNow.AddMinutes(expiryMinutes),
            session.Id.ToString("N"));
    }

    public async Task<TokenResponse> RefreshTokenAsync(string refreshToken)
    {
        var hash = _tokenHasher.Hash(refreshToken);
        var stored = await _db.RefreshTokens
            .Include(r => r.User)
            .Include(r => r.Session)
            .FirstOrDefaultAsync(r => r.TokenHash == hash);

        if (stored is null)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        // Reuse detection: revoked token used again -> revoke entire family
        if (stored.IsRevoked)
        {
            await RevokeTokenFamilyAsync(stored.FamilyId);
            throw new UnauthorizedAccessException("Token reuse detected. Sessions revoked.");
        }

        if (stored.IsExpired)
            throw new UnauthorizedAccessException("Refresh token expired.");

        var user = stored.User;
        if (user.DeletedAt is not null || user.IsLocked)
            throw new UnauthorizedAccessException("Account unavailable.");

        // Rotate: revoke old, issue new in same family
        stored.RevokedAt = DateTime.UtcNow;

        var newPlaintext = _random.GenerateToken(64);
        var newHash = _tokenHasher.Hash(newPlaintext);

        var newEntity = new RefreshToken
        {
            UserId = user.Id,
            SessionId = stored.SessionId,
            TokenHash = newHash,
            FamilyId = stored.FamilyId, // same family
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        _db.RefreshTokens.Add(newEntity);

        // Update session activity
        if (stored.Session is { IsActive: true })
            stored.Session.LastActivityAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var accessToken = GenerateAccessToken(user, stored.SessionId.ToString("N"));
        var expiryMinutes = _config.GetValue("Jwt:ExpiryMinutes", 15);
        return new TokenResponse(
            accessToken, newPlaintext,
            DateTime.UtcNow.AddMinutes(expiryMinutes),
            stored.SessionId.ToString("N"));
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var hash = _tokenHasher.Hash(refreshToken);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash);
        if (stored is { IsActive: true })
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task RevokeAllUserTokensAsync(string userId)
    {
        var active = await _db.RefreshTokens
            .Where(r => r.UserId == userId && r.RevokedAt == null)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var t in active) t.RevokedAt = now;
        await _db.SaveChangesAsync();
    }

    private string GenerateAccessToken(User user, string sessionId)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("email_verified", user.EmailVerified.ToString().ToLower()),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("sid", sessionId),
            new("sstamp", user.SecurityStamp[..8]),
        };

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

    private async Task RevokeTokenFamilyAsync(string familyId)
    {
        var tokens = await _db.RefreshTokens
            .Where(r => r.FamilyId == familyId && r.RevokedAt == null)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var t in tokens) t.RevokedAt = now;
        await _db.SaveChangesAsync();
    }
}
