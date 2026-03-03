using StackExchange.Redis;
using TicketStar.Application.Common;
using TicketStar.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace TicketStar.Application.Services;

public class RedisDistributedLock : IDistributedLock
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisDistributedLock> _logger;

    public RedisDistributedLock(IConnectionMultiplexer redis, ILogger<RedisDistributedLock> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public async Task<IDistributedLockHandle?> AcquireAsync(string key, TimeSpan ttl, CancellationToken ct = default)
    {
        var db = _redis.GetDatabase();
        var lockValue = Guid.NewGuid().ToString();
        var lockKey = CacheKeys.DistributedLock(key);

        try
        {
            // SET key value NX EX ttl
            var acquired = await db.StringSetAsync(
                lockKey,
                lockValue,
                ttl,
                When.NotExists,
                CommandFlags.DemandMaster
            );

            if (!acquired)
            {
                _logger.LogDebug("Lock already held: {LockKey}", lockKey);
                return null;
            }

            return new RedisDistributedLockHandle(db, lockKey, lockValue, _logger);
        }
        catch (RedisException ex)
        {
            // Fail-open: return null on Redis failure
            _logger.LogWarning(ex, "Redis unavailable for lock acquisition: {LockKey}", lockKey);
            return null;
        }
    }

    private class RedisDistributedLockHandle : IDistributedLockHandle
    {
        private readonly IDatabase _db;
        private readonly ILogger _logger;
        private bool _disposed;

        public string LockKey { get; }
        private string LockValue { get; }

        public RedisDistributedLockHandle(IDatabase db, string lockKey, string lockValue, ILogger logger)
        {
            _db = db;
            LockKey = lockKey;
            LockValue = lockValue;
            _logger = logger;
        }

        public async Task ReleaseAsync()
        {
            if (_disposed) return;

            try
            {
                // Only release if we still own the lock (Lua script for atomicity)
                var script = @"
                    if redis.call('get', KEYS[1]) == ARGV[1] then
                        return redis.call('del', KEYS[1])
                    else
                        return 0
                    end";

                await _db.ScriptEvaluateAsync(
                    script,
                    new RedisKey[] { LockKey },
                    new RedisValue[] { LockValue }
                );

                _logger.LogDebug("Lock released: {LockKey}", LockKey);
            }
            catch (RedisException ex)
            {
                _logger.LogWarning(ex, "Failed to release lock: {LockKey}", LockKey);
            }

            _disposed = true;
        }

        public async ValueTask DisposeAsync()
        {
            await ReleaseAsync();
            GC.SuppressFinalize(this);
        }
    }
}
