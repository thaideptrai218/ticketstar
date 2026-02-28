using TicketStar.Application.DTOs.Auth;

namespace TicketStar.Application.Interfaces;

/// <summary>
/// Short-lived cache for refresh token grace period.
/// Allows two simultaneous refreshes with the same token (multi-tab scenario)
/// to both succeed within a short window.
/// </summary>
public interface IGracePeriodCache
{
    /// <summary>Returns the cached new token response for a recently-rotated token hash, or null if expired.</summary>
    Task<TokenResponse?> GetAsync(string oldTokenHash);

    /// <summary>Caches the new token response keyed by the old token hash with a short TTL.</summary>
    Task SetAsync(string oldTokenHash, TokenResponse response, TimeSpan ttl);
}
