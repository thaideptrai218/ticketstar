# Phase 4: Access Token Shortening & Redis JTI Blacklist

## Context Links

- [TokenService.cs](../../backend/src/TicketStar.Application/Services/TokenService.cs) - `GenerateAccessToken()` at line 130, JTI claim at line 136
- [JwtOptions.cs](../../backend/src/TicketStar.Application/Options/JwtOptions.cs) - `AccessTokenMinutes = 15`
- [ServiceCollectionExtensions.cs](../../backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs) - JWT bearer config
- [AuthService.cs](../../backend/src/TicketStar.Application/Services/AuthService.cs) - `RevokeAllSessionsAsync` rotates SecurityStamp
- Phase 1 must be complete (Redis dependency)

## Overview

- **Priority:** MEDIUM (Security)
- **Status:** pending
- **Depends on:** Phase 1 (Redis infrastructure)
- **Description:** Reduce access token lifetime from 15min to 5min. Add Redis-based JTI blacklist for instant token revocation on critical events (password change, account compromise, admin action). Blacklist entries auto-expire with Redis TTL.

## Key Insights

- Current: `AccessTokenMinutes = 15` in `JwtOptions`, JTI already in claims (line 136: `Jti, Guid.NewGuid()`)
- SecurityStamp already in JWT (`sstamp` claim, first 8 chars) -- checked on refresh but NOT on every request
- Blacklist only needed for critical events, not routine logout (refresh token revocation handles that)
- Redis SET with TTL = remaining token lifetime means blacklist is self-cleaning
- Only check blacklist on sensitive endpoints (admin, payment, profile changes) to avoid Redis round-trip on every request

## Requirements

### Functional

- Change `AccessTokenMinutes` default from 15 to 5
- On critical events (password change, role change, admin force-logout), blacklist all active JTIs for that user
- Blacklist check middleware for protected endpoints
- Blacklist entries auto-expire (TTL = remaining token lifetime, max 5 min)

### Non-Functional

- Redis check adds <1ms per request (simple EXISTS command)
- Redis failure: skip blacklist check (fail-open for availability)
- No DB schema changes

## Architecture

```
Critical Event (password change) -> Get user's active session JTIs -> Redis SET jti-bl:{jti} with TTL

Request -> JwtBearerMiddleware -> [BlacklistMiddleware] -> extract JTI -> Redis EXISTS jti-bl:{jti} -> 401 if found
```

### How to get active JTIs

Option A: Store JTIs in DB when issuing tokens -- adds complexity.
Option B: Blacklist by user ID instead of individual JTIs -- simpler.

**Decision: Option B** -- blacklist by userId. Key: `user-bl:{userId}`, value: timestamp. Middleware compares JWT `iat` (issued-at) against blacklist timestamp. If `iat < blacklistTimestamp`, token is revoked.

This is simpler, no need to track individual JTIs, and covers all tokens issued before the critical event.

## Related Code Files

### Files to Modify

- `backend/src/TicketStar.Application/Options/JwtOptions.cs` -- change default `AccessTokenMinutes` to 5
- `backend/src/TicketStar.Application/Services/AuthService.cs` -- on `RevokeAllSessionsAsync`, also set Redis blacklist
- `backend/src/TicketStar.API/Program.cs` -- add blacklist middleware to pipeline

### Files to Create

- `backend/src/TicketStar.Application/Interfaces/ITokenBlacklist.cs` -- abstraction
- `backend/src/TicketStar.Infrastructure/Cache/RedisTokenBlacklist.cs` -- Redis implementation
- `backend/src/TicketStar.API/Middleware/TokenBlacklistMiddleware.cs` -- checks blacklist on each request

## Implementation Steps

1. **Change `AccessTokenMinutes` default**

    ```csharp
    // JwtOptions.cs
    public int AccessTokenMinutes { get; init; } = 5; // was 15
    ```

2. **Create `ITokenBlacklist.cs`**

    ```csharp
    namespace TicketStar.Application.Interfaces;
    public interface ITokenBlacklist
    {
        /// <summary>Blacklist all tokens for a user issued before now.</summary>
        Task BlacklistUserAsync(string userId, TimeSpan ttl);
        /// <summary>Check if user's tokens issued before a certain time are blacklisted.</summary>
        Task<DateTime?> GetBlacklistTimestampAsync(string userId);
    }
    ```

3. **Create `RedisTokenBlacklist.cs`**

    ```csharp
    // Key: "user-bl:{userId}" -> UTC ticks as string
    // TTL: AccessTokenMinutes (5 min) -- after that, all old tokens are expired anyway
    // Fail-open: if Redis unavailable, return null (allow request)
    ```

4. **Create `TokenBlacklistMiddleware.cs`**

    ```csharp
    // For authenticated requests only:
    // 1. Extract "sub" (userId) and "iat" (issued-at) from JWT claims
    // 2. Call ITokenBlacklist.GetBlacklistTimestampAsync(userId)
    // 3. If blacklist timestamp exists AND iat < blacklist timestamp -> 401
    // 4. Otherwise continue pipeline
    ```

    Only run on authenticated requests (check `context.User.Identity?.IsAuthenticated`).

5. **Update `AuthService.RevokeAllSessionsAsync()`**
    - Inject `ITokenBlacklist`
    - After revoking all tokens and rotating SecurityStamp, also:
        ```csharp
        await _tokenBlacklist.BlacklistUserAsync(userId, TimeSpan.FromMinutes(_jwtOptions.AccessTokenMinutes));
        ```
    - This instantly invalidates all access tokens for the user

6. **Add blacklist trigger to password change** (when implemented)
    - Any future `ChangePasswordAsync` should also call `BlacklistUserAsync`

7. **Register in DI and pipeline**
    - DI: `services.AddSingleton<ITokenBlacklist, RedisTokenBlacklist>();`
    - Pipeline in `Program.cs` (after `UseAuthentication`, before `UseAuthorization`):
        ```csharp
        app.UseMiddleware<TokenBlacklistMiddleware>();
        ```

## Todo List

- [ ] Change `AccessTokenMinutes` default to 5
- [ ] Create `ITokenBlacklist` interface
- [ ] Create `RedisTokenBlacklist` implementation
- [ ] Create `TokenBlacklistMiddleware`
- [ ] Inject `ITokenBlacklist` into `AuthService`
- [ ] Call `BlacklistUserAsync` in `RevokeAllSessionsAsync`
- [ ] Register in DI + add middleware to pipeline
- [ ] Test: access token with 5min lifetime
- [ ] Test: revoke-all blacklists user, subsequent requests get 401
- [ ] Test: after 5min TTL, blacklist auto-expires
- [ ] Test: Redis down allows requests through

## Success Criteria

- Access tokens expire in 5 minutes
- `RevokeAllSessions` immediately invalidates all existing access tokens via Redis blacklist
- Blacklist auto-cleans via Redis TTL
- No performance degradation (Redis EXISTS is O(1))

## Risk Assessment

- **More frequent refresh calls**: 5min tokens mean frontend refreshes 3x more often. Ensure refresh flow is solid (Phase 2 cookies, Phase 3 grace period).
- **Redis round-trip on every authed request**: ~0.5ms overhead. Acceptable.
- **Redis down**: fail-open, tokens valid until natural expiry (5min max).

## Security Considerations

- Shorter token lifetime reduces window of exposure for stolen access tokens
- Instant revocation covers critical scenarios (compromised account, admin action)
- `iat`-based blacklisting covers ALL tokens for a user, not just known JTIs
- Combined with SecurityStamp rotation, provides defense in depth

## Code Review Fixes (H5, H6)

### H5: RevokeAllSessions Not Transactional

**Problem:** `RevokeAllSessionsAsync` makes 3 separate SaveChanges calls (revoke tokens, deactivate sessions, rotate stamp). Partial failure = inconsistent state.
**Fix:** Wrap in explicit transaction:

```csharp
await _unitOfWork.BeginTransactionAsync();
try
{
    await _refreshTokenRepo.RevokeAllByUserAsync(userId);
    await _sessionRepo.DeactivateAllByUserAsync(userId);
    user.RotateSecurityStamp();
    await _unitOfWork.SaveChangesAsync();
    await _tokenBlacklist.BlacklistUserAsync(userId, TimeSpan.FromMinutes(_jwtOptions.AccessTokenMinutes));
    await _unitOfWork.CommitTransactionAsync();
}
catch
{
    await _unitOfWork.RollbackTransactionAsync();
    throw;
}
```

### H6: SecurityStamp Not Validated During Refresh

**Problem:** `TokenService.RefreshTokenAsync` checks if token is active/expired but doesn't compare the JWT's `sstamp` claim against the user's current `SecurityStamp`. After password change, old refresh tokens still work until natural expiry.
**Fix in `RefreshTokenAsync`:** After loading the user, add:

```csharp
// Validate SecurityStamp hasn't changed since token was issued
// The session was created with the stamp at that time
if (user.SecurityStamp != null)
{
    // The session's SecurityStamp should match user's current stamp
    // If stamp rotated (password change, etc.), reject refresh
}
```

**Implementation detail:** Store `SecurityStamp` (or prefix) on `AuthSession` at creation time. During refresh, compare `session.SecurityStamp` with `user.SecurityStamp`. Mismatch = reject.

## Additional Todo Items (from review)

- [ ] Wrap `RevokeAllSessionsAsync` in transaction (H5)
- [ ] Add SecurityStamp validation to `RefreshTokenAsync` (H6)
- [ ] Store SecurityStamp on AuthSession entity at session creation
- [ ] Create EF migration for AuthSession.SecurityStamp column

## Next Steps

- Add blacklist call to future password change, email change, role change endpoints
- Consider per-session blacklisting if needed (currently per-user)
