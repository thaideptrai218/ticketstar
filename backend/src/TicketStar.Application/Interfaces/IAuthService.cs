using TicketStar.Application.DTOs.Auth;

namespace TicketStar.Application.Interfaces;

public interface IAuthService
{
    Task<TokenResponse> GoogleLoginAsync(string idToken);
}
