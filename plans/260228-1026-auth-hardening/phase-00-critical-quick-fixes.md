# Phase 0: Critical Quick Fixes

## Context Links

- [Code Review Report](../reports/code-review-260228-1038-auth-security-owasp.md)
- [AuthService.cs](../../backend/src/TicketStar.Application/Services/AuthService.cs) - C1: line 233
- [AuthDtos.cs](../../backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs) - C3, H8
- [ServiceCollectionExtensions.cs](../../backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs) - H7

## Overview

- **Priority:** CRITICAL
- **Status:** done
- **Effort:** 1h
- **Description:** One-line fixes for 4 findings from OWASP review. No architectural changes. Do first.

## Fixes

### C1: Remove Plaintext Magic Link Token from Logs (CRITICAL)

**File:** `AuthService.cs:233`
**Problem:** `_logger.LogInformation("Magic link token: {Token}", rawToken)` writes plaintext token to logs. Any log aggregator = account takeover.
**Fix:** Delete the line entirely. If debug logging needed, log only the hash. log for development only.

### C3: Add Password MaxLength (CRITICAL)

**File:** `AuthDtos.cs` — `RegisterRequest` and `LoginRequest`
**Problem:** `MinLength(8)` but no `MaxLength`. Multi-MB password forces Argon2 to process entire input → trivial DoS (64MB+ RAM per request).
**Fix:** Add `[MaxLength(128)]` to Password field on both DTOs.

### H7: Make CORS Origins Configurable (HIGH)

**File:** `ServiceCollectionExtensions.cs`
**Problem:** CORS origins hardcoded to `http://localhost:3001`. Won't work in production/staging.
**Fix:** Read allowed origins from `appsettings.json` config section `Cors:AllowedOrigins` (string array).

### H8: Add MaxLength to Token DTOs (HIGH)

**File:** `AuthDtos.cs`
**Problem:** `MagicLinkVerifyRequest.Token`, `RefreshRequest.RefreshToken`, `GoogleLoginRequest.IdToken` have no length limits. Oversized payloads hit DB.
**Fix:** Add `[MaxLength(2048)]` to `IdToken`, `[MaxLength(512)]` to `Token` and `RefreshToken`.

## Implementation Steps

1. **Delete magic link log line** — `AuthService.cs:233`, remove the `_logger.LogInformation` call that logs the raw token
2. **Add `[MaxLength(128)]`** to `Password` in `RegisterRequest` and `LoginRequest`
3. **Add `[MaxLength]`** to `MagicLinkVerifyRequest.Token` (512), `RefreshRequest.RefreshToken` (512), `GoogleLoginRequest.IdToken` (2048)
4. **Move CORS origins to config:**
    - Add `"Cors": { "AllowedOrigins": ["http://localhost:3001"] }` to `appsettings.json`
    - Update `ServiceCollectionExtensions` to read from config instead of hardcoded string
5. **Compile and test** — ensure no regressions

## Todo List

- [x] Delete plaintext magic link token log (C1)
- [x] Add `[MaxLength(128)]` to Password fields (C3)
- [x] Add `[MaxLength]` to token DTOs (H8)
- [x] Move CORS origins to appsettings config (H7)
- [x] Compile check — verify no build errors
- [x] Test: oversized password returns 400
- [x] Test: CORS allows configured origins

## Success Criteria

- No sensitive tokens in logs
- Password capped at 128 chars
- Token DTOs capped at reasonable lengths
- CORS configurable per environment

## Risk Assessment

- **Minimal risk** — all are additive constraints, no behavior change for valid inputs
- **CORS change** — ensure all environments (dev, staging, prod) have origins configured

## Security Considerations

- C1 is the highest priority — token in logs is immediate account takeover vector
- C3 prevents Argon2 resource exhaustion DoS
- H8 prevents oversized payload attacks on DB layer
