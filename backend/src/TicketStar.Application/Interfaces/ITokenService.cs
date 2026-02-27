using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Domain.Entities;

namespace TicketStar.Application.Interfaces;

public interface ITokenService
{
    /// <summary>Generate JWT access token + refresh token pair for a session.</summary>
    Task<TokenResponse> GenerateTokenPairAsync(User user, AuthSession session);

    /// <summary>Rotate refresh token. Validates hash, family, expiry, security stamp.</summary>
    Task<Result<TokenResponse>> RefreshTokenAsync(string refreshToken);

    /// <summary>Revoke a single refresh token.</summary>
    Task RevokeRefreshTokenAsync(string refreshToken);

    /// <summary>Revoke all refresh tokens for a user.</summary>
    Task RevokeAllUserTokensAsync(string userId);
}
