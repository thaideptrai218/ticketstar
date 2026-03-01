using System.Threading.RateLimiting;
using StackExchange.Redis;

namespace TicketStar.API.RateLimiting;

/// <summary>
/// Redis-backed rate limiter using an atomic Lua INCR+EXPIRE script (sliding window).
/// Fails open: if Redis is unavailable, the lease is always granted.
/// </summary>
public sealed class RedisRateLimiter : RateLimiter
{
    // Atomic Lua string: increment key, set TTL only on first call (avoids resetting window).
    private const string AtomicIncrLua = """
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
        return current
        """;

    private readonly IConnectionMultiplexer _redis;
    private readonly string _key;
    private readonly int _permitLimit;
    private readonly int _windowSeconds;

    public RedisRateLimiter(IConnectionMultiplexer redis, string key, int permitLimit, TimeSpan window)
    {
        _redis = redis;
        _key = key;
        _permitLimit = permitLimit;
        _windowSeconds = (int)window.TotalSeconds;
    }

    public override TimeSpan? IdleDuration => null;

    protected override async ValueTask<RateLimitLease> AcquireAsyncCore(
        int permitCount, CancellationToken cancellationToken)
    {
        try
        {
            var db = _redis.GetDatabase();
            var count = (long)await db.ScriptEvaluateAsync(
                AtomicIncrLua,
                keys: [(RedisKey)_key],
                values: [(RedisValue)_windowSeconds]);

            return count <= _permitLimit
                ? new GrantedLease()
                : new DeniedLease(_windowSeconds);
        }
        catch
        {
            // Redis unavailable — fail open, allow the request
            return new GrantedLease();
        }
    }

    protected override RateLimitLease AttemptAcquireCore(int permitCount)
    {
        try
        {
            var db = _redis.GetDatabase();
            var count = (long)db.ScriptEvaluate(
                AtomicIncrLua,
                keys: [(RedisKey)_key],
                values: [(RedisValue)_windowSeconds]);

            return count <= _permitLimit
                ? new GrantedLease()
                : new DeniedLease(_windowSeconds);
        }
        catch
        {
            return new GrantedLease();
        }
    }

    public override RateLimiterStatistics? GetStatistics() => null;

    protected override void Dispose(bool disposing) { }

    // Minimal lease implementations
    private sealed class GrantedLease : RateLimitLease
    {
        public override bool IsAcquired => true;
        public override IEnumerable<string> MetadataNames => [];
        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            metadata = null;
            return false;
        }
        protected override void Dispose(bool disposing) { }
    }

    private sealed class DeniedLease : RateLimitLease
    {
        private readonly int _retryAfterSeconds;
        public DeniedLease(int retryAfterSeconds) => _retryAfterSeconds = retryAfterSeconds;

        public override bool IsAcquired => false;
        public override IEnumerable<string> MetadataNames => [MetadataName.RetryAfter.Name];

        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            if (metadataName == MetadataName.RetryAfter.Name)
            {
                metadata = TimeSpan.FromSeconds(_retryAfterSeconds);
                return true;
            }
            metadata = null;
            return false;
        }
        protected override void Dispose(bool disposing) { }
    }
}
