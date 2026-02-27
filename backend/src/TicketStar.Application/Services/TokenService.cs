using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class TokenService : ITokenService
{
    private readonly JwtOptions _jwtOptions;
    private readonly ITokenHasher _tokenHasher;
    private readonly ISecureRandom _random;
    private readonly IRefreshTokenRepository _refreshTokenRepo;
    private readonly IUnitOfWork _unitOfWork;

    public TokenService(
        IOptions<JwtOptions> jwtOptions,
        ITokenHasher tokenHasher,
        ISecureRandom random,
        IRefreshTokenRepository refreshTokenRepo,
        IUnitOfWork unitOfWork)
    {
        _jwtOptions = jwtOptions.Value;
        _tokenHasher = tokenHasher;
        _random = random;
        _refreshTokenRepo = refreshTokenRepo;
        _unitOfWork = unitOfWork;
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
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays),
        };
        _refreshTokenRepo.Add(entity);
        await _unitOfWork.SaveChangesAsync();

        return new TokenResponse(
            accessToken, refreshPlaintext,
            DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes),
            session.Id.ToString("N"));
    }

    public async Task<Result<TokenResponse>> RefreshTokenAsync(string refreshToken)
    {
        var hash = _tokenHasher.Hash(refreshToken);
        var stored = await _refreshTokenRepo.GetByHashWithUserAndSessionAsync(hash);

        if (stored is null)
            return Result<TokenResponse>.Failure("Invalid refresh token.", ResultError.Unauthorized);

        // Reuse detection: revoked token used again -> revoke entire family
        if (stored.IsRevoked)
        {
            await RevokeTokenFamilyAsync(stored.FamilyId);
            return Result<TokenResponse>.Failure("Token reuse detected. Sessions revoked.", ResultError.Unauthorized);
        }

        if (stored.IsExpired)
            return Result<TokenResponse>.Failure("Refresh token expired.", ResultError.Unauthorized);

        var user = stored.User;
        if (user.DeletedAt is not null || user.IsLocked)
            return Result<TokenResponse>.Failure("Account unavailable.", ResultError.Unauthorized);

        // Rotate: revoke old, issue new in same family
        stored.RevokedAt = DateTime.UtcNow;

        var newPlaintext = _random.GenerateToken(64);
        var newHash = _tokenHasher.Hash(newPlaintext);

        var newEntity = new RefreshToken
        {
            UserId = user.Id,
            SessionId = stored.SessionId,
            TokenHash = newHash,
            FamilyId = stored.FamilyId,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenDays),
        };
        _refreshTokenRepo.Add(newEntity);

        // Update session activity
        if (stored.Session is { IsActive: true })
            stored.Session.LastActivityAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        var accessToken = GenerateAccessToken(user, stored.SessionId.ToString("N"));
        return Result<TokenResponse>.Success(new TokenResponse(
            accessToken, newPlaintext,
            DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes),
            stored.SessionId.ToString("N")));
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var hash = _tokenHasher.Hash(refreshToken);
        var stored = await _refreshTokenRepo.GetByHashAsync(hash);
        if (stored is { IsActive: true })
        {
            stored.RevokedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
        }
    }

    public async Task RevokeAllUserTokensAsync(string userId)
    {
        var active = await _refreshTokenRepo.GetActiveByUserAsync(userId);
        var now = DateTime.UtcNow;
        foreach (var t in active) t.RevokedAt = now;
        await _unitOfWork.SaveChangesAsync();
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

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task RevokeTokenFamilyAsync(string familyId)
    {
        var tokens = await _refreshTokenRepo.GetActiveByFamilyAsync(familyId);
        var now = DateTime.UtcNow;
        foreach (var t in tokens) t.RevokedAt = now;
        await _unitOfWork.SaveChangesAsync();
    }
}
