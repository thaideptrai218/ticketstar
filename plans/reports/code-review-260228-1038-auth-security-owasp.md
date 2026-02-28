# Auth Security Review -- OWASP Top 10 + Auth-Specific

**Date:** 2026-02-28 | **Reviewer:** code-reviewer agent
**Scope:** Authentication system (AuthController, AuthService, TokenService, SessionService, Security services, DTOs, EF configs, Repositories)
**Focus:** CRITICAL and HIGH severity only

## Executive Summary

The auth system shows solid fundamentals: Argon2id with OWASP 2025 params, SHA-256 hashed refresh tokens with family-based reuse detection, atomic brute-force protection, magic link concurrency guards, and security stamp revocation. However, several CRITICAL and HIGH issues remain -- most notably a plaintext magic link token logged in production-reachable code, missing rate limiting on login/register/refresh endpoints, no password maximum length enforcement (enabling hash-DoS), missing HTTPS enforcement, and a race condition window in token rotation.

---

## CRITICAL Findings

### C1. Magic Link Token Logged in Plaintext (CWE-532, OWASP A09)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs` line 233

```csharp
_logger.LogInformation("=== DEV ONLY - MAGIC LINK TOKEN for {Email}: {Token} ===", email, token);
```

**Problem:** This `LogInformation` call writes the plaintext magic link token to structured logs. Despite the "DEV ONLY" comment, `LogInformation` is enabled in production (`appsettings.json` sets `Default: Information`). Any log aggregation system (CloudWatch, ELK, Datadog) captures this. An attacker with log access can authenticate as any user who requested a magic link.

**Impact:** Full account takeover for any user requesting a magic link. Equivalent to storing passwords in plaintext logs.

**Fix:** Remove the line entirely. If needed for dev, guard with `if (Environment.IsDevelopment())` or use `LogDebug` only (which IS suppressed in production). Note line 230 already logs the hash prefix via `LogDebug`, which is correct.

```csharp
// DELETE line 233 entirely, or:
#if DEBUG
_logger.LogDebug("DEV: Magic link token for {Email}: {Token}", email, token);
#endif
```

---

### C2. No Rate Limiting on Login Endpoint (CWE-307, OWASP A07)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Controllers/AuthController.cs` lines 26-28
**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs` lines 117-134

**Problem:** Only the `magic-link/request` endpoint has rate limiting. The `login`, `register`, `refresh`, and `google-login` endpoints have NO rate limiting. While there is an account lockout after 5 failed attempts, this only protects individual accounts -- it does NOT prevent:
- Credential stuffing across many accounts (different email each attempt)
- Password spraying (same password, many emails)
- Distributed brute force from multiple IPs
- DoS via expensive Argon2 hashing (each login attempt costs ~64MB RAM for 3 iterations)

**Impact:** Credential stuffing attacks at scale. Argon2 hash-DoS can exhaust server memory with concurrent login attempts (each consuming 64MB x 4 parallelism = 256MB peak).

**Fix:** Add rate limiting policies for all auth endpoints:

```csharp
// In ServiceCollectionExtensions.AddRateLimiting():
opt.AddPolicy("auth-login", ctx =>
    RateLimitPartition.GetSlidingWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            SegmentsPerWindow = 2,
            QueueLimit = 0
        }));

opt.AddPolicy("auth-register", ctx =>
    RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0
        }));

// Apply to controller:
[EnableRateLimiting("auth-login")]
[HttpPost("login")]

[EnableRateLimiting("auth-register")]
[HttpPost("register")]
```

---

### C3. No Password Maximum Length -- Argon2 Hash-DoS (CWE-400, OWASP A07)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs` lines 6-9

```csharp
public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string FullName);
```

**Problem:** No `MaxLength` on Password. An attacker can send a 1MB+ password, forcing Argon2id to process it (pre-hash step). Combined with no rate limiting on register/login, this enables memory exhaustion and CPU DoS. Argon2 libraries typically hash the full input before the Argon2 rounds.

**Impact:** Denial of service. A single request with a multi-megabyte password can consume significant server resources.

**Fix:** Add `[MaxLength(128)]` (or `[StringLength(128)]`) to Password in both `RegisterRequest` and `LoginRequest`:

```csharp
public record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(8), MaxLength(128)] string Password,
    [Required, MaxLength(200)] string FullName);

public record LoginRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MaxLength(128)] string Password);
```

---

## HIGH Findings

### H1. No HTTPS Enforcement / HSTS Headers (CWE-319, OWASP A02)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Program.cs`

**Problem:** No `UseHttpsRedirection()` or `UseHsts()` in the pipeline. The Kestrel endpoint is configured as `http://localhost:5010`. In production, without HTTPS enforcement:
- JWTs transit in plaintext (bearer tokens interceptable)
- Refresh tokens transit in plaintext
- Passwords transit in plaintext
- Session cookies (if any) are interceptable

**Impact:** Man-in-the-middle attacks can capture all auth tokens and credentials.

**Fix:** Add HTTPS enforcement for non-development environments:

```csharp
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}
app.UseHttpsRedirection();
```

Also configure Kestrel with HTTPS endpoint for production.

---

### H2. No Security Response Headers (CWE-693, OWASP A05)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Program.cs`

**Problem:** No security headers middleware. Missing headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Cache-Control: no-store` on auth responses (tokens could be cached by proxies)
- `X-XSS-Protection: 0` (disable legacy, rely on CSP)

**Impact:** Various browser-side attacks (clickjacking, MIME sniffing, auth response caching).

**Fix:** Add security headers middleware:

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Cache-Control"] = "no-store";
    context.Response.Headers["Pragma"] = "no-cache";
    await next();
});
```

---

### H3. Refresh Token Rotation Race Condition (CWE-362, OWASP A04)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/TokenService.cs` lines 60-109

**Problem:** The `RefreshTokenAsync` method reads the token, checks `IsRevoked`, revokes the old one, creates a new one, and saves -- all without a transaction or optimistic concurrency token. If two concurrent requests use the same refresh token:

1. Request A reads token (not revoked)
2. Request B reads token (not revoked) -- same token, same state
3. Request A revokes old, creates new token A2, saves
4. Request B revokes old (already revoked, but `RevokedAt` overwrites), creates new token B2, saves
5. Now two valid tokens exist (A2 and B2) in the same family, and reuse detection does NOT trigger because neither A2 nor B2 is revoked

The `RefreshToken` entity has NO concurrency token (unlike `MagicLink` which has `RowVersion`).

**Impact:** Token theft may go undetected. An attacker who steals a refresh token can race the legitimate user and maintain persistent access without triggering the family revocation.

**Fix:** Either add a concurrency token to `RefreshToken` (like MagicLink's `RowVersion`) or wrap the rotation in a serializable transaction:

```csharp
// Option A: Add RowVersion to RefreshToken entity
public DateTime RowVersion { get; set; }

// In RefreshTokenConfiguration:
builder.Property(t => t.RowVersion).IsConcurrencyToken();

// Option B: Serializable transaction
await _unitOfWork.BeginTransactionAsync();
try
{
    // ... existing rotation logic ...
    await _unitOfWork.SaveChangesAsync();
    await _unitOfWork.CommitTransactionAsync();
}
catch (DbUpdateConcurrencyException)
{
    await _unitOfWork.RollbackTransactionAsync();
    return Result<TokenResponse>.Failure("Token already used.", ResultError.Unauthorized);
}
```

---

### H4. Logout Does Not Validate Token Ownership (CWE-639, OWASP A01)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Controllers/AuthController.cs` lines 49-51

```csharp
[Authorize]
[HttpPost("logout")]
public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    => FromResult(await _authService.LogoutAsync(request.RefreshToken), "Logged out successfully.");
```

**Problem:** The `LogoutAsync` method looks up the refresh token by hash and revokes it, but never checks that the token belongs to the authenticated user (from the JWT `sub` claim). Any authenticated user can revoke any other user's refresh token if they know/guess the token value.

While guessing a 64-byte CSPRNG token is impractical, the principle of defense-in-depth requires ownership validation. This is an Insecure Direct Object Reference (IDOR) pattern.

**Impact:** Theoretical session hijack vector. More importantly, it violates security best practices and could become exploitable if token entropy is reduced or tokens leak.

**Fix:** Validate token ownership in `LogoutAsync`:

```csharp
public async Task<Result> LogoutAsync(string refreshToken, string userId)
{
    var hash = _tokenHasher.Hash(refreshToken);
    var stored = await _refreshTokenRepo.GetByHashAsync(hash);
    if (stored is null) return Result.Success();

    if (stored.UserId != userId)
        return Result.Failure("Invalid token.", ResultError.Unauthorized);

    // ... rest of logout logic
}
```

---

### H5. RevokeAllSessions -- No Transaction Boundary (CWE-362, OWASP A04)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs` lines 298-313

```csharp
public async Task<Result> RevokeAllSessionsAsync(string userId)
{
    await _tokenService.RevokeAllUserTokensAsync(userId);
    await _sessionService.DeactivateAllSessionsAsync(userId);
    user.SecurityStamp = Guid.NewGuid().ToString("N");
    await _unitOfWork.SaveChangesAsync();
}
```

**Problem:** Three separate `SaveChangesAsync` calls (one in `RevokeAllUserTokensAsync`, one in `DeactivateAllSessionsAsync`, one for SecurityStamp) without a wrapping transaction. If the process crashes between token revocation and security stamp rotation, tokens are revoked but existing JWTs remain valid (the stamp in the JWT still matches the old stamp in DB). The operation is not atomic.

Compare with `LogoutAsync` which correctly uses `BeginTransactionAsync`.

**Impact:** Partial revocation -- user believes all sessions are revoked, but active JWTs with old security stamp may still be accepted.

**Fix:** Wrap in a transaction like `LogoutAsync`:

```csharp
public async Task<Result> RevokeAllSessionsAsync(string userId)
{
    await _unitOfWork.BeginTransactionAsync();
    try
    {
        await _tokenService.RevokeAllUserTokensAsync(userId);
        await _sessionService.DeactivateAllSessionsAsync(userId);

        var user = await _userRepo.GetByIdAsync(userId);
        if (user is not null)
        {
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            await _unitOfWork.SaveChangesAsync();
        }

        await _unitOfWork.CommitTransactionAsync();
    }
    catch
    {
        await _unitOfWork.RollbackTransactionAsync();
        throw;
    }
    // ...
}
```

---

### H6. SecurityStamp Not Validated on Token Refresh (CWE-613, OWASP A07)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/TokenService.cs` lines 60-109

**Problem:** `RefreshTokenAsync` checks `stored.IsRevoked`, `stored.IsExpired`, and `user.DeletedAt/IsLocked`, but does NOT compare the `sstamp` claim from the current JWT against `user.SecurityStamp`. The security stamp is embedded in the JWT (line 140: `new("sstamp", user.SecurityStamp[..8])`) for precisely this purpose -- to invalidate tokens after password change or revoke-all. But the refresh endpoint does not receive or validate the JWT, only the refresh token string.

This means after `RevokeAllSessions`, new refresh tokens are revoked, but a stolen refresh token from before the revocation that somehow was not in the DB query results (race condition, replication lag) could still generate a new valid JWT.

**Impact:** Weakens the security stamp revocation mechanism. The stamp is generated but its validation gap reduces its effectiveness.

**Fix:** Either (a) require the current access token be sent alongside the refresh token so the stamp can be validated, or (b) store the security stamp snapshot on the `RefreshToken` entity and compare during refresh:

```csharp
// On RefreshToken entity:
public string SecurityStampSnapshot { get; set; } = null!;

// During refresh:
if (stored.SecurityStampSnapshot != user.SecurityStamp[..8])
    return Result<TokenResponse>.Failure("Session invalidated.", ResultError.Unauthorized);
```

---

### H7. CORS AllowCredentials with Hardcoded Origin (OWASP A05)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Program.cs` lines 27-36

```csharp
options.AddPolicy("AllowFrontend", policy =>
{
    policy.WithOrigins("http://localhost:3001")
          .AllowAnyMethod()
          .AllowAnyHeader()
          .AllowCredentials();
});
```

**Problem:** The CORS origin is hardcoded to `http://localhost:3001` (HTTP, not HTTPS). In production, this either (a) blocks all frontend requests if the origin changes, or (b) requires code changes for deployment. More concerning: `.AllowCredentials()` combined with `.AllowAnyHeader()` is permissive. Also, there is no production CORS configuration -- suggesting this config will be used as-is or widened to `*` (which with AllowCredentials is rejected by browsers, but indicates missing production config planning).

**Impact:** Either broken production deployment (no CORS for prod domain) or overly permissive CORS if widened.

**Fix:** Use configuration-based CORS origins:

```csharp
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3001"];

options.AddPolicy("AllowFrontend", policy =>
{
    policy.WithOrigins(corsOrigins)
          .AllowAnyMethod()
          .AllowAnyHeader()
          .AllowCredentials();
});
```

---

### H8. No Input Validation on Magic Link and Refresh Token Length (CWE-20, OWASP A03)

**Files:**
- `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs` lines 19-21

```csharp
public record MagicLinkVerifyRequest([Required] string Token);
public record RefreshRequest([Required] string RefreshToken);
```

**Problem:** No `MaxLength` on Token or RefreshToken fields. An attacker can send a multi-megabyte string as a token. The SHA-256 hashing (`SHA256.HashData(Encoding.UTF8.GetBytes(token))`) will process the entire input. While SHA-256 is fast, this still enables:
- Memory allocation for the string (up to configured `MaxRequestBodySize`)
- DB query with a 64-char hash (no direct SQL injection, but unnecessary processing)

Combined with no rate limiting on `refresh` and `magic-link/verify`, this amplifies DoS potential.

**Fix:**

```csharp
public record MagicLinkVerifyRequest([Required, MaxLength(256)] string Token);
public record RefreshRequest([Required, MaxLength(256)] string RefreshToken);
```

---

## OWASP Top 10 (2021) Coverage Matrix

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | **FAIL** | H4: Logout IDOR (no token ownership check) |
| A02 | Cryptographic Failures | **FAIL** | H1: No HTTPS enforcement; AuthIdentity stores OAuth tokens unencrypted (noted in code comments) |
| A03 | Injection | **PASS** | EF Core parameterizes all queries; no raw SQL found |
| A04 | Insecure Design | **FAIL** | H3: Refresh token rotation race condition; H5: Non-atomic revoke-all |
| A05 | Security Misconfiguration | **FAIL** | H2: No security headers; H7: Hardcoded CORS; C2: Missing rate limiting |
| A06 | Vulnerable Components | **PASS** | Argon2, JWT libs are current; no known CVEs in dependencies |
| A07 | Auth Failures | **FAIL** | C2: No rate limiting on login; C3: No password max length; H6: SecurityStamp not validated on refresh |
| A08 | Software/Data Integrity | **PASS** | JWT signed with HMAC-SHA256; refresh tokens use family-based reuse detection |
| A09 | Logging/Monitoring Failures | **FAIL** | C1: Magic link token in plaintext logs |
| A10 | SSRF | **PASS** | No outbound requests from user input (Google token validation uses Google's library with fixed endpoints) |

**Pass: 4/10 | Fail: 6/10**

---

## Positive Observations

- Argon2id with OWASP 2025 parameters (t=3, m=64MB, p=4) -- excellent choice
- SHA-256 hashed refresh tokens, never stored in plaintext
- Refresh token family-based reuse detection -- proper rotation security
- Constant-time token comparison available (Sha256TokenHasher.Verify)
- Account lockout after 5 failed attempts with atomic increment (ExecuteUpdateAsync prevents race)
- Magic link concurrency guard via RowVersion
- Security stamp in JWT for revocation capability
- Uniform error messages ("Invalid credentials") prevent user enumeration on login
- Magic link request returns success regardless of email existence
- Google OAuth correctly validates email verification status
- Google OAuth rejects silent provider merge (prevents account linking attacks)
- Soft-delete aware lookups (IgnoreQueryFilters) for security-sensitive queries
- Global exception middleware prevents stack trace leakage
- JWT ClockSkew set to Zero (strict expiry)
- CSPRNG for token generation (64 bytes = 512 bits entropy)

---

## Recommended Actions (Priority Order)

1. **[CRITICAL] Remove plaintext magic link token from logs** (C1) -- 1 line delete
2. **[CRITICAL] Add rate limiting to login, register, refresh endpoints** (C2) -- ~30 lines
3. **[CRITICAL] Add MaxLength to Password field in DTOs** (C3) -- 1 line per DTO
4. **[HIGH] Add HTTPS enforcement and HSTS** (H1) -- ~5 lines
5. **[HIGH] Add security response headers** (H2) -- ~10 lines
6. **[HIGH] Add concurrency token to RefreshToken for rotation safety** (H3) -- ~15 lines
7. **[HIGH] Validate token ownership in LogoutAsync** (H4) -- ~5 lines
8. **[HIGH] Wrap RevokeAllSessions in transaction** (H5) -- ~15 lines
9. **[HIGH] Add SecurityStamp validation during refresh** (H6) -- ~10 lines
10. **[HIGH] Make CORS origins configurable** (H7) -- ~5 lines
11. **[HIGH] Add MaxLength to token DTOs** (H8) -- 1 line per DTO

---

## Unresolved Questions

1. **AuthIdentity.AccessToken/ProviderRefreshToken** -- Code comments note these are "NOT YET ENCRYPTED." When is AES-256 encryption planned? Storing OAuth provider tokens in plaintext in the DB is a data-at-rest risk (CWE-312). Currently not populated by any flow, so low urgency.

2. **JWT access token lifetime** -- `appsettings.json` has `ExpiryMinutes: 15` but `JwtOptions` defaults to `AccessTokenMinutes = 15`. The config key is `ExpiryMinutes` but the code reads `AccessTokenMinutes`. Are these the same? If the config key doesn't match, the default (15 min) is used silently. Verify the config binding.

3. **Magic link single-use enforcement** -- The `GetByHashWithUserAsync` query filters `m.UsedAt == null`, and `RowVersion` provides optimistic concurrency. But what if `SaveChangesAsync` on line 251 throws `DbUpdateConcurrencyException`? The exception bubbles up to GlobalExceptionMiddleware and returns a generic 500, not a clear "token already used" message. Should catch `DbUpdateConcurrencyException` explicitly and return 401.

4. **Stale refresh tokens cleanup** -- No background job or scheduled task to clean up expired/revoked refresh tokens from the DB. Over time, this table will grow unbounded. Not a security issue per se, but operational concern.

5. **Admin seeder password** -- `DbSeeder` falls back to `Admin@123!` if `Admin:Password` config is missing. This is weak for a production admin account. Consider requiring the env var and failing startup if missing.
