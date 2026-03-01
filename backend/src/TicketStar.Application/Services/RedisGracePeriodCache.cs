using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;

namespace TicketStar.Application.Services;

/// <summary>
/// Redis implementation of IGracePeriodCache.
/// Key: "grace:{oldTokenHash}" → JSON-serialized TokenResponse with 10s TTL.
/// Fails open: if Redis is unavailable, GetAsync returns null (triggers normal revocation).
/// </summary>
public class RedisGracePeriodCache : IGracePeriodCache
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisGracePeriodCache> _logger;

    public RedisGracePeriodCache(IConnectionMultiplexer redis, ILogger<RedisGracePeriodCache> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<TokenResponse?> GetAsync(string oldTokenHash)
    {
        try
        {
            var db = _redis.GetDatabase();
            var json = await db.StringGetAsync($"grace:{oldTokenHash}");
            if (!json.HasValue) return null;

            return JsonSerializer.Deserialize<TokenResponse>(json!);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Grace period cache GET failed — failing open");
            return null;
        }
    }

    public async Task SetAsync(string oldTokenHash, TokenResponse response, TimeSpan ttl)
    {
        try
        {
            var db = _redis.GetDatabase();
            // M2: Strip refresh token before storing — it's in an HttpOnly cookie, not needed here.
            var sanitized = response with { RefreshToken = string.Empty };
            var json = JsonSerializer.Serialize(sanitized);
            await db.StringSetAsync($"grace:{oldTokenHash}", json, ttl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Grace period cache SET failed — grace period unavailable for this rotation");
        }
    }
}
