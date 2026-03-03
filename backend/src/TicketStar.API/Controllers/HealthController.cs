using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;

namespace TicketStar.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<HealthController> _logger;

    public HealthController(IConnectionMultiplexer redis, ILogger<HealthController> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    [HttpGet("live")]
    public IActionResult Live() => Ok(new { status = "alive" });

    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        var redisReady = _redis.GetDatabase().Ping() != TimeSpan.Zero;

        return Ok(new
        {
            status = redisReady ? "ready" : "degraded",
            checks = new
            {
                redis = redisReady ? "up" : "down"
            }
        });
    }
}
