using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using TicketStar.Application.Interfaces;

namespace TicketStar.Application.Services;

/// <summary>
/// Redis implementation of ITokenBlacklist.
/// Key: "user-bl:{userId}" → UTC ticks as string.
/// TTL = AccessTokenMinutes so entries self-clean once all old tokens are naturally expired.
/// Fail-open: Redis errors return null (allow request through).
/// </summary>
public class RedisTokenBlacklist : ITokenBlacklist
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisTokenBlacklist> _logger;

    private static string Key(string userId) => $"user-bl:{userId}";

    public RedisTokenBlacklist(IConnectionMultiplexer redis, ILogger<RedisTokenBlacklist> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task BlacklistUserAsync(string userId, TimeSpan ttl)
    {
        try
        {
            var db = _redis.GetDatabase();
            var ticks = DateTime.UtcNow.Ticks.ToString();
            await db.StringSetAsync(Key(userId), ticks, ttl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Token blacklist SET failed for user {UserId} — blacklist not applied", userId);
        }
    }

    public async Task<DateTime?> GetBlacklistTimestampAsync(string userId)
    {
        try
        {
            var db = _redis.GetDatabase();
            var value = await db.StringGetAsync(Key(userId));
            if (!value.HasValue) return null;

            if (long.TryParse(value, out var ticks))
                return new DateTime(ticks, DateTimeKind.Utc);

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Token blacklist GET failed for user {UserId} — failing open", userId);
            return null;
        }
    }
}
