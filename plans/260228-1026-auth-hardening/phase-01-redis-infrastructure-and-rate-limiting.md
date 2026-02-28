# Phase 1: Redis Infrastructure & Rate Limiting

## Context Links

- [ServiceCollectionExtensions.cs](../../backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs) - current rate limiting config
- [Program.cs](../../backend/src/TicketStar.API/Program.cs) - app pipeline
- [docker-compose.yml](../../docker-compose.yml) - Redis already defined (port 6380)
- [TicketStar.API.csproj](../../backend/src/TicketStar.API/TicketStar.API.csproj) - `StackExchange.Redis` already installed

## Overview

- **Priority:** HIGH
- **Status:** done
- **Description:** Wire Redis into DI, create shared `IRedisService` abstraction, replace in-memory `FixedWindowRateLimiter` with Redis-backed distributed rate limiting on `/login`, `/register`, `/refresh`, and `/magic-link/request`.

## Key Insights

- `StackExchange.Redis` 2.8.24 already in API csproj -- also need to add to Infrastructure csproj
- Current rate limiting: only `magic-link` policy using in-memory `FixedWindowRateLimiter` (loses state on restart, doesn't work multi-instance)
- Redis in docker-compose: `redis:7-alpine`, port 6380->6379, password from `REDIS_PASSWORD` env var
- ASP.NET Core's built-in `AddRateLimiter` supports custom partitioners -- use Redis via `IConnectionMultiplexer` for atomic counters

## Requirements

### Functional

- Redis connection singleton registered in DI
- Health check for Redis added to `/health/ready`
- Rate limits per IP: `/login` 10 req/5min, `/register` 5 req/15min, `/refresh` 30 req/5min, `/magic-link/request` 5 req/15min (existing)
- 429 response with `Retry-After` header

### Non-Functional

- Must work across multiple API instances (distributed)
- Redis failure should NOT block requests (graceful degradation -- allow through)
- Connection string from config, not hardcoded

## Architecture

```
Request -> RateLimiter Middleware -> Redis INCR with TTL -> Allow/Reject(429)
```

Use Redis Lua script via `StackExchange.Redis` for atomic sliding window:

- Key: `rl:{policyName}:{partitionKey}` (e.g., `rl:login:192.168.1.1`)
- INCR + EXPIRE in single Lua eval for atomicity

## Related Code Files

### Files to Modify

- `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs` -- add Redis DI, rewrite `AddRateLimiting()`
- `backend/src/TicketStar.API/Program.cs` -- add Redis health check
- `backend/src/TicketStar.API/Controllers/AuthController.cs` -- add `[EnableRateLimiting]` attributes to login, register, refresh

### Files to Create

- `backend/src/TicketStar.Application/Options/RedisOptions.cs` -- config POCO
- `backend/src/TicketStar.Application/Interfaces/IRedisService.cs` -- shared Redis abstraction (Phases 3 & 4 use this)
- `backend/src/TicketStar.Infrastructure/Cache/RedisService.cs` -- implements `IRedisService` via `IConnectionMultiplexer`
- `backend/src/TicketStar.API/RateLimiting/RedisRateLimiterPolicy.cs` -- custom `IRateLimiterPolicy` using `IConnectionMultiplexer` directly
- `backend/src/TicketStar.API/RateLimiting/RedisRateLimiter.cs` -- extends `RateLimiter`, runs Lua INCR+EXPIRE

## Implementation Steps

1. **Create `RedisOptions.cs`**

    ```csharp
    // backend/src/TicketStar.Application/Options/RedisOptions.cs
    namespace TicketStar.Application.Options;
    public class RedisOptions
    {
        public const string SectionName = "Redis";
        public string ConnectionString { get; init; } = "localhost:6379";
    }
    ```

2. **Create `IRedisService.cs` + `RedisService.cs`**
    ```csharp
    // backend/src/TicketStar.Application/Interfaces/IRedisService.cs
    namespace TicketStar.Application.Interfaces;
    public interface IRedisService
    {
        Task SetAsync(string key, string value, TimeSpan? ttl = null);
        Task<string?> GetAsync(string key);
        Task<bool> DeleteAsync(string key);
        Task<bool> ExistsAsync(string key);
        Task<long> IncrementAsync(string key);
        Task ExpireAsync(string key, TimeSpan ttl);
    }
    ```
    ```csharp
    // backend/src/TicketStar.Infrastructure/Cache/RedisService.cs
    // Wraps IConnectionMultiplexer.GetDatabase()
    // All methods fail-open (catch RedisException, return default)
    // Registered as Singleton in DI
    ```

3. **Register Redis connection in DI** (`ServiceCollectionExtensions.AddRedis()`)
    - Bind `RedisOptions` from config
    - Register `IConnectionMultiplexer` as singleton
    - Register `IRedisService` as singleton (`RedisService`)
    - Handle connection failures gracefully (log warning, don't crash)

4. **Create `RedisRateLimiterPolicy.cs` + `RedisRateLimiter.cs`**
    - Implement `IRateLimiterPolicy<HttpContext>` for each endpoint policy
    - Use `IConnectionMultiplexer.GetDatabase()` to run atomic Lua script:
        ```lua
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
        return current
        ```
    - Partition key: `RemoteIpAddress` (fallback "unknown")
    - If Redis unavailable, allow request (fail-open)

4. **Update `ServiceCollectionExtensions.cs`**
    - Add `AddRedis(IConfiguration)` method: bind `RedisOptions`, register `IConnectionMultiplexer` singleton
    - Rewrite `AddRateLimiting()` to use Redis-backed policies:
        - `"login"`: 10 req / 5 min
        - `"register"`: 5 req / 15 min
        - `"refresh"`: 30 req / 5 min
        - `"magic-link"`: 5 req / 15 min (migrate existing)

5. **Update `Program.cs`**
    - Call `builder.Services.AddRedis(builder.Configuration)` before `AddRateLimiting()`
    - Add Redis health check: `.AddRedis(redisConnStr, name: "redis", tags: ["infra", "ready"])`
    - Need package `AspNetCore.HealthChecks.Redis` -- add to csproj

6. **Update `AuthController.cs`**
    - Add `[EnableRateLimiting("login")]` to `Login()`
    - Add `[EnableRateLimiting("register")]` to `Register()`
    - Add `[EnableRateLimiting("refresh")]` to `Refresh()`
    - Keep existing `[EnableRateLimiting("magic-link")]` on `RequestMagicLink()`

7. **Add `appsettings.json` config**
    ```json
    "Redis": {
      "ConnectionString": "localhost:6380,password=your_password"
    }
    ```

## Todo List

- [x] Add `StackExchange.Redis` to Infrastructure csproj
- [x] Create `RedisOptions.cs`
- [x] Create `IRedisService.cs` interface
- [x] Create `RedisService.cs` implementation (fail-open on Redis errors)
- [x] Register `IConnectionMultiplexer` + `IRedisService` in `AddRedis()` extension
- [x] Create `RedisRateLimiterPolicy.cs` + `RedisRateLimiter.cs` with Lua-based sliding window
- [x] Rewrite `AddRateLimiting()` to use Redis-backed policies
- [x] Update `Program.cs` with Redis health check
- [x] Add `[EnableRateLimiting]` attributes to AuthController endpoints
- [x] Add `AspNetCore.HealthChecks.Redis` package
- [x] Update appsettings with Redis connection string
- [x] Test: verify rate limit triggers 429 after threshold
- [x] Test: verify Redis failure allows requests through (fail-open)
- [x] Test: `IRedisService` basic operations (set/get/delete)

## Success Criteria

- All auth endpoints rate-limited via Redis
- Rate limits survive API restart (persisted in Redis)
- Redis health check on `/health/ready`
- Graceful degradation when Redis is down

## Risk Assessment

- **Redis downtime**: Mitigated by fail-open policy (allow requests when Redis unavailable)
- **Lua script complexity**: Simple INCR+EXPIRE pattern, well-documented

## Security Considerations

- Rate limiting prevents credential stuffing on `/login`
- Prevents bot registration spam on `/register`
- IP-based partitioning; consider adding user-based limits later for authenticated endpoints

## Next Steps

- Phase 3 and 4 depend on the Redis infrastructure established here
