# Code Review: Auth Security Hardening (e2f031e)

## Scope

- Files: 54 changed (~4,600 LOC added)
- Focus: Security, correctness, edge cases, architecture
- Phases: Critical fixes, Redis rate limiting, HttpOnly cookies, grace period, token blacklist, TOTP MFA

## Overall Assessment

Solid security hardening. Good fail-open Redis strategy, proper token rotation with family-based reuse detection, correct use of Argon2id/SHA-256/AES-256. Several issues found, one critical.

---

## Critical Issues

### C1: MFA Challenge Returns Refresh Token in Response Body [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Controllers/MfaController.cs` (line 73)

```csharp
return Ok(ApiResponse<TokenResponse>.Ok(result.Value!, HttpContext.TraceIdentifier));
```

The `TokenResponse` record includes `RefreshToken` in the JSON body. Every other auth endpoint uses HttpOnly cookies for the refresh token. This endpoint bypasses that, exposing the refresh token to JavaScript (XSS-exfiltrable).

**Fix:** Use the same `FromTokenResult` / `SetTokenCookie` pattern from `AuthController`. Either move the helper to a shared base or call it here.

### C2: MFA Token Uses Same Signing Key as Access Tokens [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/MfaService.cs` (lines 142-156)

The MFA challenge token is signed with `_jwtOptions.Secret` -- the same key as access tokens. Although the `purpose` claim differentiates them, the `TokenBlacklistMiddleware` does not check for `purpose` claim. A valid MFA token could potentially pass JWT validation and reach authorized endpoints if `iat` check passes.

**Mitigation:** The JWT bearer middleware validates `sub` as userId and `iat`, and MFA tokens lack `sid`/`sstamp`/role claims, so most endpoints would fail on missing claims. Still, defense-in-depth says use a separate key or add `purpose != "mfa_challenge"` check in the JWT bearer `OnTokenValidated` event.

**Risk:** Medium (requires specific claim extraction patterns to exploit).

---

## High Priority

### H1: Recovery Code Comparison Not Constant-Time [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/MfaService.cs` (line 188)

```csharp
var match = codes.FirstOrDefault(rc => !rc.IsUsed && rc.CodeHash == hash);
```

String `==` comparison on hashes. Since these are SHA-256 hashes stored in DB and compared after hashing user input, timing attack surface is minimal (attacker doesn't control hash directly). Low practical risk but worth noting.

### H2: Race Condition in MFA Setup [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/MfaService.cs` (lines 52-63)

`GenerateSetupAsync` overwrites `user.MfaSecret` unconditionally. If called twice concurrently, the second call overwrites the first's secret. Then `VerifySetupAsync` verifies against the second secret. No transaction or check prevents this. Not critical since it's an authenticated endpoint, but could confuse users.

**Fix:** Check if `MfaEnabled` is already true and reject, or use optimistic concurrency.

### H3: `BlacklistUserAsync` Called Inside DB Transaction [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs` (lines 348-350)

```csharp
await _tokenBlacklist.BlacklistUserAsync(
    userId, TimeSpan.FromMinutes(_jwtOptions.AccessTokenMinutes));
await _unitOfWork.CommitTransactionAsync();
```

Redis SET happens before DB commit. If commit fails, Redis has a blacklist entry but DB state is rolled back. Tokens appear blacklisted but sessions/tokens aren't actually revoked in DB. Move the Redis call after commit.

### H4: `RedisRateLimiter.AcquireAsyncCore` Calls Synchronous Method [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/RateLimiting/RedisRateLimiter.cs` (lines 34-36)

```csharp
protected override ValueTask<RateLimitLease> AcquireAsyncCore(...)
    => new(AcquireCore());
```

`AcquireCore()` calls `db.ScriptEvaluate` synchronously, blocking a thread pool thread. Should use `ScriptEvaluateAsync`.

### H5: Modular Bias in Recovery Code Generation

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/MfaCryptoHelper.cs` (line 113)

```csharp
result[i] = chars[bytes[i] % chars.Length]; // chars.Length = 31
```

`256 % 31 = 8`, so characters 0-7 have slightly higher probability. For 8-char codes from a 31-char alphabet, the bias is negligible for recovery codes but technically impure.

---

## Medium Priority

### M1: Magic Link Token Logged at Debug Level [No]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs` (line 258)

```csharp
_logger.LogDebug("=== DEV ONLY - MAGIC LINK TOKEN for {Email}: {Token} ===", email, token);
```

Comment says "filtered out in production" but this depends on configuration. If someone sets Debug level in prod (for troubleshooting), plaintext tokens appear in logs. Use `#if DEBUG` preprocessor directive instead.

### M2: Grace Period Cache Stores Refresh Token in Redis [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/RedisGracePeriodCache.cs`

`TokenResponse` (including plaintext refresh token) is serialized to Redis with 10s TTL. If Redis is compromised, refresh tokens are exposed. TTL is short (10s), so risk is bounded. Consider storing only the access token + session ID and re-deriving the refresh token, or encrypting the cached value.

### M3: `RedisService` Catches Only `RedisException` [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Infrastructure/Cache/RedisService.cs`

Only catches `RedisException`. Timeout exceptions (`TimeoutException`) and `ObjectDisposedException` would bubble up. `RedisGracePeriodCache` and `RedisTokenBlacklist` catch generic `Exception` which is correct. `RedisService` should match.

### M4: No Input Validation on MFA TOTP Code Length [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs` (line 42)

```csharp
public record MfaChallengeRequest([Required] string MfaToken, [Required] string Code);
```

No `MaxLength` on `Code`. Should be `[StringLength(8)]` (6 for TOTP, 8 for recovery). Same for `MfaVerifySetupRequest` and `MfaDisableRequest`.

### M5: 14 Constructor Parameters in AuthService [Not Sure but if you can show me example i will approve]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs` (lines 33-49)

14 dependencies. Consider grouping related repos behind an aggregate or using a mediator pattern in future refactors.

---

## Low Priority

### L1: `RowVersion` on RefreshToken Uses `DateTime?` [Yes Mysql]

Typically concurrency tokens use `byte[]` (SQL Server rowversion) or `uint` for MySQL. `DateTime?` works with EF Core's concurrency check but is less standard.

### L2: Duplicate `GetUserId`/`GetIp`/`GetUserAgent` Helpers [Yes]

Both `AuthController` and `MfaController` define identical helper methods. Extract to `ApiControllerBase`.

### L3: `IRedisService` in Domain Layer [Yes]

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Domain/Interfaces/IRedisService.cs`

Redis is infrastructure. This interface belongs in Application layer (or not at all if only used by Infrastructure). Domain should have zero infrastructure awareness.

---

## Positive Observations

- Token rotation with family-based reuse detection is well implemented
- Fail-open Redis strategy is consistent and correct
- Atomic Lua script for rate limiting avoids race conditions
- HttpOnly/Secure/SameSite=Strict cookie config is correct
- Soft-deleted user lookup (`IgnoreQueryFilters`) prevents account takeover
- Account lockout with atomic increment prevents brute force race conditions
- Security event audit trail covers all auth operations
- AES-256-CBC with random IV for MFA secret encryption
- Recovery codes hashed with SHA-256, never stored plaintext

---

## Recommended Actions (Priority Order)

1. **[Critical]** Fix MFA challenge endpoint to use HttpOnly cookie for refresh token
2. **[Critical]** Move `BlacklistUserAsync` call after `CommitTransactionAsync`
3. **[High]** Make rate limiter async (`ScriptEvaluateAsync`)
4. **[High]** Add MFA token purpose validation in JWT bearer `OnTokenValidated`
5. **[Medium]** Replace `LogDebug` magic link with `#if DEBUG`
6. **[Medium]** Add `MaxLength`/`StringLength` to MFA DTO code fields
7. **[Medium]** Catch `Exception` instead of `RedisException` in `RedisService`
8. **[Low]** Move `IRedisService` out of Domain layer
9. **[Low]** Extract shared controller helpers to base class

---

## Metrics

- Type Coverage: N/A (C# strongly typed)
- Test Coverage: 35 existing + new AuthService tests (MfaService untested)
- Linting Issues: Not run (no `dotnet format` in scope)
- Files >200 LOC: `MfaService.cs` (209 lines, minor)

## Unresolved Questions

1. Is there a plan to add MfaService unit tests? Currently untested. No i want to implement
2. Should the `RowVersion` concurrency token on `RefreshToken` use MySQL's native `TIMESTAMP` type instead of `DateTime?` for stronger guarantees? Is native timeStamp
3. Is `IRedisService` in Domain intentional or tech debt to track? IRedisService in Domain is wrong.
