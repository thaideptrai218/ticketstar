---
title: "Auth Hardening - 6 Security Phases"
description: "Critical fixes, Redis rate limiting, HttpOnly cookies, multi-tab grace, token blacklist, TOTP MFA"
status: done
priority: P1
effort: 22h
branch: main
tags: [auth, security, redis, mfa, owasp]
created: 2026-02-28
code_review: plans/reports/code-review-260228-1038-auth-security-owasp.md
---

# Auth Hardening Plan

## Code Review Findings Incorporated

3 CRITICAL + 8 HIGH issues from OWASP review. OWASP score: 4/10. Findings distributed across phases below.

## Phases

| #   | Phase                                | Priority     | Effort | Status  | File                                                           | Review Fixes   |
| --- | ------------------------------------ | ------------ | ------ | ------- | -------------------------------------------------------------- | -------------- |
| 0   | Critical Quick Fixes                 | **CRITICAL** | 1h     | done    | [phase-00](phase-00-critical-quick-fixes.md)                   | C1, C3, H7, H8 |
| 1   | Redis Infrastructure & Rate Limiting | HIGH         | 3h     | done    | [phase-01](phase-01-redis-infrastructure-and-rate-limiting.md) | C2             |
| 2   | HttpOnly Cookie + Security Headers   | HIGH         | 5h     | done    | [phase-02](phase-02-httponly-cookie-refresh-token.md)          | H1, H2, H4     |
| 3   | Multi-Tab Reuse Grace Period         | MEDIUM       | 3h     | done    | [phase-03](phase-03-multi-tab-reuse-grace-period.md)           | H3             |
| 4   | Access Token Shortening & Blacklist  | MEDIUM       | 4h     | done    | [phase-04](phase-04-access-token-shortening-and-blacklist.md)  | H5, H6         |
| 5   | TOTP MFA Implementation              | MEDIUM       | 6h     | done    | [phase-05](phase-05-totp-mfa-implementation.md)                | —              |

## Dependencies

- **Phase 0 first** — one-line fixes, no dependencies, blocks nothing
- Phase 1 (Redis) must complete before phases 3, 4
- Phase 2 (cookies + headers) independent, can parallel with phase 1
- Phase 3 depends on phase 1 (Redis for grace period cache)
- Phase 4 depends on phase 1 (Redis for blacklist)
- Phase 5 independent, best done last (largest scope)

## Key Architecture Decisions

- **Redis**: Already in docker-compose (port 6380), `StackExchange.Redis` already in API csproj. Just need DI wiring.
- **Rate limiting**: Redis Lua script (INCR+EXPIRE) for atomic sliding window
- **Cookie**: `SameSite=Strict` + `Secure` + `HttpOnly` eliminates need for separate CSRF token
- **Grace period**: Redis key `grace:{oldTokenHash}` with 10s TTL storing last-issued token pair
- **Blacklist**: Redis key `user-bl:{userId}` with TTL = AccessTokenMinutes, `iat`-based comparison
- **MFA**: Otp.NET library for TOTP, QRCoder (already installed) for QR codes

## Shared Infrastructure

- New: `IRedisService` interface + `RedisService` in Infrastructure layer
- New: `RedisOptions` in Application/Options
- Registration in `ServiceCollectionExtensions.AddApplicationServices()`

## Frontend Impact

- Phase 2: Frontend must switch from sending refresh token in body to relying on cookies (`credentials: 'include'`)
- Phase 5: New MFA setup/challenge UI pages needed

## Review Finding → Phase Mapping

| Finding | Severity | Phase | Description                                             |
| ------- | -------- | ----- | ------------------------------------------------------- |
| C1      | CRITICAL | 0     | Plaintext magic link token logged in AuthService.cs:233 |
| C2      | CRITICAL | 1     | No rate limiting on login/register/refresh              |
| C3      | CRITICAL | 0     | No password MaxLength → Argon2 DoS                      |
| H1      | HIGH     | 2     | No HTTPS enforcement / HSTS                             |
| H2      | HIGH     | 2     | No security response headers                            |
| H3      | HIGH     | 3     | Refresh token rotation race condition (no RowVersion)   |
| H4      | HIGH     | 2     | Logout IDOR — no token ownership validation             |
| H5      | HIGH     | 4     | RevokeAllSessions not transactional                     |
| H6      | HIGH     | 4     | SecurityStamp not validated during refresh              |
| H7      | HIGH     | 0     | CORS origins hardcoded to localhost                     |
| H8      | HIGH     | 0     | No MaxLength on token DTOs                              |
