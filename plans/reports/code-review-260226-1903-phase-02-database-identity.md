# Code Review: Phase 2 - Database & Identity

**Date:** 2026-02-26 | **Reviewer:** code-reviewer | **Scope:** 38 files, ~1100 LOC

## Overall Assessment

Solid foundation. Entity models are clean, EF configurations well-structured, auth flows mostly correct. However, there are **2 critical** and **3 high-priority** issues that must be addressed before merge.

---

## Critical Issues

### C1. Magic link token stored in plaintext (SECURITY)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/MagicLinkService.cs` (lines 50-60)

Magic link tokens are stored as raw `Guid.ToString("N")` in DB. Refresh tokens use SHA-256 hashing, but magic links do not. A DB leak exposes all active magic links for account takeover.

**Fix:** Hash magic link tokens with SHA-256 before storage, same as refresh tokens.

```csharp
// In MagicLinkService.RequestAsync:
var token = Guid.NewGuid().ToString("N");
var hashedToken = HashToken(token); // same SHA256 approach as TokenService
var entity = new MagicLinkToken { ..., Token = hashedToken, ... };

// In VerifyAsync, hash before lookup:
var hashedToken = HashToken(token);
var entity = await _db.MagicLinkTokens.FirstOrDefaultAsync(m => m.Token == hashedToken && !m.IsUsed);
```

### C2. AuthService.RequestMagicLinkAsync does not persist token to DB

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs` (lines 60-88)

`AuthService.RequestMagicLinkAsync` generates a token and logs it but **never saves it to DB**. The comment says "Save token to DB handled by MagicLinkService" but the method doesn't call MagicLinkService. Meanwhile, the controller correctly calls `MagicLinkService.RequestAsync` (not `AuthService`), so this is dead code that will confuse future devs.

Additionally, `AuthService.VerifyMagicLinkAsync` throws `NotImplementedException`.

**Fix:** Remove `RequestMagicLinkAsync` and `VerifyMagicLinkAsync` from `IAuthService` and `AuthService`. The controller already uses `MagicLinkService` directly. Having two paths for magic link creates confusion. Alternatively, make `AuthService` delegate to `MagicLinkService`.

---

## High Priority

### H1. Duplicate user-creation logic across 3 locations

**Files:**
- `AuthService.GoogleLoginAsync` (lines 39-55)
- `AuthService.RequestMagicLinkAsync` (lines 62-79) -- dead code, but still
- `MagicLinkService.RequestAsync` (lines 32-48)

The "find or create user + assign Attendee role" pattern is copy-pasted 3 times. Extract to a shared method like `EnsureUserAsync(email, fullName, avatarUrl)`.

### H2. Missing index on RefreshToken.Token column

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Infrastructure/Data/Configurations/RefreshTokenConfiguration.cs`

`RefreshTokenAsync` queries by `Token` (hashed), but there is no index on `Token`. Under load, this is a full table scan on every refresh. MagicLinkToken has a unique index on Token; RefreshToken should too.

**Fix:** Add `builder.HasIndex(r => r.Token).IsUnique();`

### H3. Rate limiter uses global partition, not per-IP

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Program.cs` (lines 55-64)

`AddFixedWindowLimiter` without a partition key creates a **global** limiter -- all users share 5 requests per 15 min. One user exhausting the quota blocks everyone.

**Fix:** Use `AddPolicy` with IP-based partitioning:
```csharp
opt.AddPolicy("magic-link", ctx =>
    RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(15),
            QueueLimit = 0
        }));
```

---

## Medium Priority

### M1. `CURRENT_TIMESTAMP(6)` is MySQL-specific syntax

**Files:** All EF configurations use `.HasDefaultValueSql("CURRENT_TIMESTAMP(6)")`.

This is MySQL-specific (fractional seconds). Works fine for now but prevents switching to PostgreSQL later. Acceptable for MVP, but note the coupling.

### M2. No `ConcurrencyToken` on TicketType.SoldCount

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Domain/Entities/TicketType.cs`

`SoldCount` is prone to race conditions when multiple orders update it concurrently. Consider adding a concurrency token or using SQL `UPDATE ... SET SoldCount = SoldCount + @qty WHERE SoldCount + @qty <= Quota` pattern when implementing the order flow.

### M3. Enum stored as string without explicit values

**Files:** `EventStatus.cs`, `OrderStatus.cs`, `PaymentStatus.cs`

Enums are stored as strings (good for readability), but enum member reordering won't break data. However, renaming a member will. Consider adding `[EnumMember]` attributes or a comment warning against renaming.

### M4. `SetUpdatedAt` in AppDbContext iterates all entries

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Infrastructure/Data/AppDbContext.cs` (lines 40-48)

Using `ChangeTracker.Entries()` with LINQ on every save. For large batch operations this is O(n). Acceptable for MVP but consider an interceptor or shadow property approach later.

### M5. Google OAuth does not handle locked users

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs`

`GoogleLoginAsync` finds user but never checks `user.IsLocked`. A locked user can still log in via Google OAuth.

**Fix:** Add check after user lookup:
```csharp
if (user is not null && user.IsLocked)
    throw new UnauthorizedAccessException("Account is locked.");
```

Same check needed in `MagicLinkService.VerifyAsync`.

---

## Low Priority

### L1. Default admin password in seeder

**File:** `DbSeeder.cs` line 54 -- fallback `"Admin@123!"` is fine for dev but ensure production overrides via config/env.

### L2. `MagicLinkService` not behind an interface

Registered as concrete type `AddScoped<MagicLinkService>()`. For testability and consistency, extract `IMagicLinkService`.

### L3. Unused `CheckIn` navigation on `Event`

Event has `ICollection<CheckIn> CheckIns` and CheckIn has `EventId`, but this creates a redundant path (Ticket already links to Event). Acceptable for query convenience.

---

## Positive Observations

- Refresh token rotation with reuse detection -- well-implemented security pattern
- SHA-256 hashing of refresh tokens before DB storage
- Proper `DeleteBehavior` choices (Restrict on user FKs, Cascade on owned entities)
- Clean entity separation, no logic in domain models (except computed props on RefreshToken)
- Automatic `UpdatedAt` via SaveChanges override
- Rate limiting on magic link endpoint
- Anti-enumeration response ("If the email exists...")
- Swagger with JWT security definition
- ClockSkew = TimeSpan.Zero on JWT validation

---

## Recommended Actions (Priority Order)

1. **[Critical]** Hash magic link tokens before storage (C1)
2. **[Critical]** Remove dead magic-link code from AuthService or properly delegate (C2)
3. **[High]** Add unique index on RefreshToken.Token (H2)
4. **[High]** Fix rate limiter to partition by IP (H3)
5. **[High]** Extract shared user-creation logic (H1)
6. **[Medium]** Add IsLocked check on all auth flows (M5)
7. **[Medium]** Plan concurrency strategy for SoldCount (M2)

---

## Unresolved Questions

1. Is MySQL the final DB choice? `CURRENT_TIMESTAMP(6)` and `decimal(12,0)` tie to MySQL. If PostgreSQL is planned, address early.
2. Should magic link tokens use cryptographically random strings instead of `Guid.ToString("N")`? GUIDs are predictable on some platforms.
3. Will there be a background job to clean up expired RefreshTokens and MagicLinkTokens? Without one, these tables grow unbounded.
