namespace TicketStar.Application.Interfaces;

/// <summary>
/// Redis-backed token blacklist. Blacklists all access tokens for a user by storing
/// a timestamp; any token issued before that timestamp is rejected.
/// </summary>
public interface ITokenBlacklist
{
    /// <summary>Blacklist all tokens for a user issued before now. TTL auto-cleans entry.</summary>
    Task BlacklistUserAsync(string userId, TimeSpan ttl);

    /// <summary>Returns the blacklist timestamp for a user, or null if not blacklisted.</summary>
    Task<DateTime?> GetBlacklistTimestampAsync(string userId);
}
