using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Infrastructure.Cache;

/// <summary>
/// Redis-backed implementation of IRedisService. All methods fail-open:
/// Redis exceptions are caught and default values returned so callers are not disrupted.
/// </summary>
public class RedisService : IRedisService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisService> _logger;

    public RedisService(IConnectionMultiplexer redis, ILogger<RedisService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    private IDatabase Db => _redis.GetDatabase();

    public async Task SetAsync(string key, string value, TimeSpan? ttl = null)
    {
        try
        {
            await Db.StringSetAsync(key, value, ttl);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis SET failed for key {Key}", key);
        }
    }

    public async Task<string?> GetAsync(string key)
    {
        try
        {
            var value = await Db.StringGetAsync(key);
            return value.HasValue ? (string?)value : null;
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis GET failed for key {Key}", key);
            return null;
        }
    }

    public async Task<bool> DeleteAsync(string key)
    {
        try
        {
            return await Db.KeyDeleteAsync(key);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis DEL failed for key {Key}", key);
            return false;
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            return await Db.KeyExistsAsync(key);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis EXISTS failed for key {Key}", key);
            return false;
        }
    }

    public async Task<long> IncrementAsync(string key)
    {
        try
        {
            return await Db.StringIncrementAsync(key);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis INCR failed for key {Key}", key);
            return 0;
        }
    }

    public async Task ExpireAsync(string key, TimeSpan ttl)
    {
        try
        {
            await Db.KeyExpireAsync(key, ttl);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis EXPIRE failed for key {Key}", key);
        }
    }
}
