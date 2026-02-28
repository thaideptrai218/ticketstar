using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using StackExchange.Redis;

namespace TicketStar.API.RateLimiting;

/// <summary>
/// IRateLimiterPolicy that partitions by client IP and uses Redis for distributed counting.
/// </summary>
public sealed class RedisRateLimiterPolicy : IRateLimiterPolicy<string>
{
    private readonly IConnectionMultiplexer _redis;
    private readonly string _policyName;
    private readonly int _permitLimit;
    private readonly TimeSpan _window;

    public RedisRateLimiterPolicy(
        IConnectionMultiplexer redis,
        string policyName,
        int permitLimit,
        TimeSpan window)
    {
        _redis = redis;
        _policyName = policyName;
        _permitLimit = permitLimit;
        _window = window;
    }

    public Func<OnRejectedContext, CancellationToken, ValueTask>? OnRejected =>
        (ctx, _) =>
        {
            ctx.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            ctx.HttpContext.Response.Headers.RetryAfter = ((int)_window.TotalSeconds).ToString();
            return ValueTask.CompletedTask;
        };

    public RateLimitPartition<string> GetPartition(HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var key = $"rl:{_policyName}:{ip}";

        return RateLimitPartition.Get(
            key,
            partitionKey => new RedisRateLimiter(_redis, partitionKey, _permitLimit, _window));
    }
}
