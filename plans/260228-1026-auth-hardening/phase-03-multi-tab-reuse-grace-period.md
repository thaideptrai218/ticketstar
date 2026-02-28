# Phase 3: Multi-Tab Reuse Grace Period

## Context Links

- [TokenService.cs](../../backend/src/TicketStar.Application/Services/TokenService.cs) - `RefreshTokenAsync()` lines 60-109, reuse detection at line 69
- [RefreshToken.cs](../../backend/src/TicketStar.Domain/Entities/RefreshToken.cs) - entity with FamilyId
- [IRefreshTokenRepository.cs](../../backend/src/TicketStar.Domain/Interfaces/IRefreshTokenRepository.cs) - `GetActiveByFamilyAsync`
- Phase 1 must be complete (Redis dependency)

## Overview

- **Priority:** MEDIUM (UX Critical)
- **Status:** pending
- **Depends on:** Phase 1 (Redis infrastructure)
- **Description:** Add 10-second grace period for refresh token reuse. When the same (already-rotated) refresh token is used within 10s of its rotation, return the already-issued new token pair instead of revoking the entire family. Prevents "two tabs refresh simultaneously, one gets revoked" bug.

## Key Insights

- Current behavior in `TokenService.RefreshTokenAsync()` (line 69-73): if `stored.IsRevoked`, immediately calls `RevokeTokenFamilyAsync()` -- nukes all tokens in family
- This is correct for actual token theft but overly aggressive for multi-tab scenarios
- Supabase pattern: store the last-issued pair in Redis with short TTL, replay it on duplicate use
- Redis key: `grace:{oldTokenHash}` -> JSON `{accessToken, refreshToken, expiresAt, sessionId}` with 10s TTL

## Requirements

### Functional

- When refresh token is rotated, cache the old token hash -> new response in Redis (10s TTL)
- When a revoked token is used AND a grace cache entry exists, return the cached response instead of revoking family
- When a revoked token is used AND no grace cache exists (>10s), revoke family as before
- Grace period: 10 seconds (configurable)

### Non-Functional

- Redis failure: fall back to current behavior (revoke family immediately)
- No DB schema changes needed

## Architecture

```
RefreshTokenAsync(oldToken):
  hash = SHA256(oldToken)
  stored = DB.GetByHash(hash)

  if stored.IsRevoked:
    graceEntry = Redis.GET("grace:{hash}")
    if graceEntry exists:
      return graceEntry  // replay cached response
    else:
      RevokeTokenFamily(stored.FamilyId)  // real theft
      return error

  // Normal rotation
  stored.RevokedAt = now
  newTokens = generateNewPair()
  Redis.SET("grace:{hash}", newTokens, TTL=10s)  // cache for grace period
  return newTokens
```

## Related Code Files

### Files to Modify

- `backend/src/TicketStar.Application/Services/TokenService.cs` -- inject Redis, add grace period logic to `RefreshTokenAsync()`
- `backend/src/TicketStar.Application/Interfaces/ITokenService.cs` -- no change needed (same public API)

### Files to Create

- `backend/src/TicketStar.Application/Interfaces/IGracePeriodCache.cs` -- abstraction for grace period cache
- `backend/src/TicketStar.Infrastructure/Cache/RedisGracePeriodCache.cs` -- Redis implementation

## Implementation Steps

1. **Create `IGracePeriodCache.cs`**

    ```csharp
    namespace TicketStar.Application.Interfaces;
    public interface IGracePeriodCache
    {
        Task<TokenResponse?> GetAsync(string oldTokenHash);
        Task SetAsync(string oldTokenHash, TokenResponse response, TimeSpan ttl);
    }
    ```

2. **Create `RedisGracePeriodCache.cs`**

    ```csharp
    // backend/src/TicketStar.Infrastructure/Cache/RedisGracePeriodCache.cs
    // Uses IConnectionMultiplexer from Phase 1
    // Key: "grace:{oldTokenHash}"
    // Value: JSON-serialized TokenResponse
    // TTL: 10 seconds
    // Fail-open: if Redis unavailable, GetAsync returns null (triggers family revocation)
    ```

3. **Update `TokenService.RefreshTokenAsync()`**
    - Inject `IGracePeriodCache` via constructor
    - After reuse detection (line 69, `stored.IsRevoked`):

        ```csharp
        if (stored.IsRevoked)
        {
            // Check grace period before revoking family
            var cached = await _gracePeriodCache.GetAsync(hash);
            if (cached is not null)
                return Result<TokenResponse>.Success(cached);

            await RevokeTokenFamilyAsync(stored.FamilyId);
            return Result<TokenResponse>.Failure("Token reuse detected. Sessions revoked.", ResultError.Unauthorized);
        }
        ```

    - After successful rotation (before return), cache the new response:
        ```csharp
        await _gracePeriodCache.SetAsync(hash, tokenResponse, TimeSpan.FromSeconds(10));
        ```

4. **Register `IGracePeriodCache` in DI**
    - Add to `ServiceCollectionExtensions.AddApplicationServices()`:
        ```csharp
        services.AddScoped<IGracePeriodCache, RedisGracePeriodCache>();
        ```

## Todo List

- [ ] Create `IGracePeriodCache` interface
- [ ] Create `RedisGracePeriodCache` implementation
- [ ] Inject `IGracePeriodCache` into `TokenService`
- [ ] Add grace period check before family revocation in `RefreshTokenAsync`
- [ ] Cache new token response after successful rotation
- [ ] Register in DI
- [ ] Test: two simultaneous refreshes with same token within 10s both succeed
- [ ] Test: reuse after 10s still revokes family
- [ ] Test: Redis down falls back to immediate revocation

## Success Criteria

- Two tabs refreshing simultaneously with same token both get valid responses
- Genuine token theft (reuse after >10s) still triggers family revocation
- No DB schema changes
- Graceful degradation when Redis unavailable

## Risk Assessment

- **Replay window**: 10s window where stolen token could be replayed. Acceptable tradeoff -- refresh tokens are already long-lived, and the window is very short.
- **Redis dependency**: Fail-open means if Redis is down, we revert to current (aggressive) behavior. No UX regression vs. today.

## Security Considerations

- Grace period is a tradeoff: 10s replay window vs. UX of multi-tab users getting logged out
- The cached response is the SAME token pair (not a new one), so no additional tokens are created
- After 10s TTL, the cache entry auto-expires and reuse triggers full family revocation
- Log grace period hits as `SecurityEventType.TokenRefreshed` for monitoring

## Code Review Fix (H3)

### H3: Refresh Token Rotation Race Condition

**Problem:** `RefreshToken` entity has no concurrency token (`RowVersion`), unlike `MagicLink` which has one. Two simultaneous refresh requests can both read the same token as "active", both rotate it, creating duplicate new tokens.
**Fix:**

1. Add `RowVersion` (MySQL `TIMESTAMP(6)`) to `RefreshToken` entity, matching `MagicLink` pattern
2. Update `RefreshTokenConfiguration.cs` with `IsRowVersion()` mapping
3. Handle `DbUpdateConcurrencyException` in `TokenService.RefreshTokenAsync()` — if caught, retry once or return the grace-cached response
4. Create EF migration for the new column

```csharp
// RefreshToken.cs
[Timestamp]
public byte[] RowVersion { get; set; } = null!;
```

This fix is **complementary** to the grace period — the grace period handles the UX, the RowVersion prevents data corruption.

## Additional Todo Items (from review)

- [ ] Add `RowVersion` to `RefreshToken` entity (H3)
- [ ] Update `RefreshTokenConfiguration.cs` with concurrency mapping
- [ ] Handle `DbUpdateConcurrencyException` in `RefreshTokenAsync`
- [ ] Create EF migration for RowVersion column

## Next Steps

- Monitor grace period cache hit rate to validate the 10s window is appropriate
