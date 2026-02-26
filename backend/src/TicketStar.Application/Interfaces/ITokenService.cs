using TicketStar.Application.DTOs.Auth;
using TicketStar.Domain.Entities;

namespace TicketStar.Application.Interfaces;

public interface ITokenService
{
    Task<TokenResponse> GenerateTokenPairAsync(ApplicationUser user);
    Task<TokenResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeRefreshTokenAsync(string refreshToken);
}
