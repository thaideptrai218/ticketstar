# Auth Backend Architecture — Developer Guide

> For backend developers working on TicketStar's authentication system.

## Middleware Pipeline

Requests pass through this ordered pipeline:

```
GlobalExceptionMiddleware → Security Headers → CORS → RateLimiter
  → Authentication → TokenBlacklistMiddleware → Authorization → Controllers
```

**TokenBlacklistMiddleware** checks every authenticated request against Redis. Extracts `iat` claim from JWT, compares to user's blacklist timestamp (`user-bl:{userId}`). If `iat < blacklistTimestamp` → 401 "Token revoked." Fail-open on Redis errors.

## Service Architecture

```
Controllers (API layer) — inherit from ApiControllerBase
    ↓ (helpers: GetUserId, GetIp, GetUserAgent, IsHttps)
AuthService / MfaService (orchestration)
    ↓
TokenService / SessionService (token & session management)
    ↓
Security Services (IPasswordHasher, ITokenHasher, ISecureRandom)
    ↓
Repositories → AppDbContext (MySQL) + RedisService (Redis)
```

**ApiControllerBase** provides shared helpers:
- `GetUserId()` — extract sub/NameIdentifier claim
- `GetIp()` — remote IP address
- `GetUserAgent()` — User-Agent header
- `IsHttps` — detect HTTPS (includes X-Forwarded-Proto check for proxies)
- `FromResult<T>(result)` — maps Result<T> to HTTP response with proper status codes

### DI Lifetimes

| Lifetime      | Services                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Singleton** | IPasswordHasher (Argon2), ITokenHasher (SHA-256), ISecureRandom, ITokenBlacklist, IRedisService, IConnectionMultiplexer |
| **Scoped**    | IAuthService, ITokenService, IMfaService, ISessionService, IGracePeriodCache, all repositories, IUnitOfWork             |

## Authentication Flows

### Email Login

```
POST /api/auth/login (rate: 10/5min)
  → AuthService.LoginAsync()
    → Find user (includes soft-deleted via IgnoreQueryFilters)
    → Check account lock (5 failed attempts → 15min lock)
    → Verify password (Argon2id)
    → Reset FailedLoginCount on success
    → If MfaEnabled: return MfaChallengeResponse (mfaToken, 5min JWT)
    → Else: create AuthSession + generate token pair
  → Controller sets refresh_token httpOnly cookie
  → Returns AccessTokenResponse (no refresh token in body)
```

### Registration

```
POST /api/auth/register (rate: 5/15min)
  → AuthService.RegisterAsync()
    → Check email uniqueness (includes soft-deleted)
    → Create User (Argon2id hash, Role=User, EmailVerified=false)
    → Create AuthIdentity (Provider=Email)
    → Create session + tokens
  → 201 with AccessTokenResponse + cookie
```

### Google OAuth

```
POST /api/auth/google-login
  → AuthService.GoogleLoginAsync()
    → Validate Google ID token (GoogleJsonWebSignature)
    → Require payload.EmailVerified (H1 security fix)
    → If user exists: reject if no Google provider linked (prevents silent merge)
    → If new: create User + UserProfile (name, avatar from Google)
    → Upsert AuthIdentity for Google
    → MFA check → session + tokens
```

### Magic Link

```
POST /api/auth/magic-link/request (rate: 5/15min)
  → Always returns 200 (prevents email enumeration)
  → If user found: generate 32-byte token, store SHA-256 hash, expires 10min

POST /api/auth/magic-link/verify
  → Hash token → lookup → check expiry → set UsedAt (optimistic concurrency)
  → Verify email if needed → MFA check → session + tokens
```

### Token Refresh

```
POST /api/auth/refresh (rate: 30/5min)
  → Read refresh_token from cookie
  → TokenService.RefreshTokenAsync()
    → Hash token → lookup RefreshToken (with User, Session)
    → If revoked:
        → Check grace cache (10s window for multi-tab)
        → If cached: return cached response
        → Else: revoke entire token family → 401 "Token reuse detected"
    → If expired: 401
    → If user deleted/locked: 401
    → Rotate: revoke old token, create new with same FamilyId
    → Update session LastActivityAt
    → Cache new response under old hash for 10s grace period
    → On DbUpdateConcurrencyException: check grace cache → retry path
```

### Logout & Revocation

```
POST /api/auth/logout [Authorize]
  → Transaction: revoke refresh token + deactivate session
  → Clear cookie. Idempotent (succeeds even without cookie)

POST /api/auth/revoke-all [Authorize]
  → Transaction: revoke all tokens + deactivate all sessions
  → Rotate SecurityStamp
  → Blacklist user in Redis (TTL = AccessTokenMinutes)
  → All existing JWTs invalidated via TokenBlacklistMiddleware
```

## MFA (TOTP)

### Setup Flow

```
POST /api/auth/mfa/setup [Authorize]
  → Guard: reject if MfaEnabled already true (race condition protection)
  → Generate 20-byte TOTP secret (Base32)
  → AES-256 encrypt → store in user.MfaSecret
  → Return secret + otpauth:// URI + QR code (PNG base64)

POST /api/auth/mfa/verify-setup [Authorize]
  → Decrypt secret → verify TOTP code (±1 step / 90s tolerance)
  → Validate code field: StringLength(8) minimum
  → Set MfaEnabled=true
  → Generate 8 recovery codes (8 chars, uppercase alphanumeric)
  → Store as SHA-256 hashes, return plaintext codes once
```

### Challenge Flow (during login)

```
POST /api/auth/mfa/challenge (rate: login policy)
  → Validate mfaToken JWT (purpose="mfa_challenge", 5min expiry)
  → Verify TOTP code OR consume recovery code (constant-time comparison for recovery codes)
  → Create session + generate full token pair
  → Set refresh_token as HttpOnly cookie
  → Returns AccessTokenResponse (body contains only accessToken + expiresAt + sessionId)
```

### Disable

```
POST /api/auth/mfa/disable [Authorize]
  → Verify TOTP or recovery code
  → Set MfaEnabled=false, clear MfaSecret, delete recovery codes
```

## JWT Access Token

**Algorithm:** HMAC-SHA256, **Expiry:** 5 minutes, **ClockSkew:** Zero

| Claim            | Value                             |
| ---------------- | --------------------------------- |
| `sub`            | User.Id                           |
| `email`          | User.Email                        |
| `jti`            | Random GUID                       |
| `email_verified` | "true" / "false"                  |
| `role`           | User.Role.ToString()              |
| `sid`            | AuthSession.Id (GUID, no hyphens) |
| `sstamp`         | User.SecurityStamp first 8 chars  |
| `purpose`        | "full_access" or "mfa_challenge"  |

**Token Validation:** TokenBlacklistMiddleware rejects tokens with `purpose=mfa_challenge` — they cannot access protected endpoints. Only `purpose=full_access` tokens are allowed past authorization.

## Database Schema

### User

| Column                | Type        | Notes                            |
| --------------------- | ----------- | -------------------------------- |
| Id                    | string      | GUID, no hyphens                 |
| Email                 | string(256) | Unique index                     |
| EmailVerified         | bool        |                                  |
| PasswordHash          | string?     | Argon2id. Null for OAuth-only    |
| Role                  | string(20)  | UserRole enum                    |
| SecurityStamp         | string(100) | Rotated on critical events       |
| FailedLoginCount      | int         | Reset on successful login        |
| LockedUntil           | DateTime?   | 15min after 5 failures           |
| MfaEnabled            | bool        |                                  |
| MfaSecret             | string?     | AES-256 encrypted                |
| DeletedAt             | DateTime?   | Soft delete, global query filter |
| CreatedAt / UpdatedAt | DateTime    | Auto-managed                     |

**Computed:** `IsLocked` = `LockedUntil > UtcNow`

### RefreshToken

| Column     | Type         | Notes                 |
| ---------- | ------------ | --------------------- |
| Id         | Guid         |                       |
| UserId     | string(450)  | FK → User             |
| SessionId  | Guid         | FK → AuthSession      |
| TokenHash  | string(128)  | SHA-256, unique index |
| FamilyId   | string(100)  | Groups rotation chain |
| ExpiresAt  | DateTime     | UtcNow + 7 days       |
| RevokedAt  | DateTime?    |                       |
| RowVersion | timestamp(6) | Concurrency token     |

**Computed:** `IsExpired`, `IsRevoked`, `IsActive`

### AuthSession

| Column            | Type         | Notes                  |
| ----------------- | ------------ | ---------------------- |
| Id                | Guid         | Embedded in JWT `sid`  |
| UserId            | string(450)  | FK → User              |
| IpAddress         | string?(45)  |                        |
| UserAgent         | string?(500) | Truncated to 512 chars |
| DeviceFingerprint | string?(64)  | SHA-256(IP\|UA)        |
| IsActive          | bool         |                        |
| LastActivityAt    | DateTime     | Updated on refresh     |
| RevokedAt         | DateTime?    |                        |

**Index:** `(UserId, IsActive)`

### MagicLink

| Column     | Type        | Notes                     |
| ---------- | ----------- | ------------------------- |
| TokenHash  | string(128) | SHA-256, unique index     |
| ExpiresAt  | DateTime    | UtcNow + 10 minutes       |
| UsedAt     | DateTime?   | Atomic set via RowVersion |
| RowVersion | timestamp   | Prevents double-use race  |

### AuthIdentity

| Column         | Type         | Notes                  |
| -------------- | ------------ | ---------------------- |
| Provider       | AuthProvider | Email, Google          |
| ProviderUserId | string       |                        |
| LastUsedAt     | DateTime?    | Updated on OAuth login |

### MfaRecoveryCode

| Column   | Type       | Notes                            |
| -------- | ---------- | -------------------------------- |
| CodeHash | string(64) | SHA-256(code.ToUpperInvariant()) |
| UsedAt   | DateTime?  | Set on consumption               |

### SecurityEvent

| Column                | Type              | Notes                               |
| --------------------- | ----------------- | ----------------------------------- |
| Id                    | long              | Auto-increment                      |
| UserId                | string?           | Nullable for unknown-email attempts |
| EventType             | SecurityEventType | 21 event types                      |
| Success               | bool              |                                     |
| FailureReason         | string?           |                                     |
| IpAddress / UserAgent | string?           |                                     |
| Metadata              | string?           | Optional JSON                       |

## Redis Keys

| Pattern                | Purpose                                    | TTL                |
| ---------------------- | ------------------------------------------ | ------------------ |
| `user-bl:{userId}`     | Token blacklist timestamp                  | AccessTokenMinutes |
| `grace:{oldTokenHash}` | Cached AccessTokenResponse (no refresh token) for multi-tab refresh | 10 seconds         |
| `rl:{policy}:{ip}`     | Rate limit counter                         | Window seconds     |

**All Redis operations fail-open** — Redis unavailable = requests pass through.

## Security Crypto Summary

| Operation          | Algorithm | Details                                  |
| ------------------ | --------- | ---------------------------------------- |
| Password hashing   | Argon2id  | t=3, m=64MB, p=4 (OWASP 2025)            |
| Token hashing      | SHA-256   | Constant-time comparison (FixedTimeEquals) |
| Random generation  | CSPRNG    | URL-safe Base64, configurable length     |
| TOTP secrets       | AES-256   | Random 16-byte IV prepended              |
| TOTP verification  | OtpNet    | 6 digits, SHA1, 30s period, ±1 step      |
| Recovery codes     | SHA-256   | Constant-time comparison, 8 codes, 8 chars, uppercase alphanumeric |
| Device fingerprint | SHA-256   | SHA-256(IP\|UserAgent)                   |

## Configuration (appsettings.json)

| Section      | Key Properties                                                                     |
| ------------ | ---------------------------------------------------------------------------------- |
| `Jwt`        | Secret (≥32 chars), Issuer, Audience, AccessTokenMinutes (5), RefreshTokenDays (7) |
| `Mfa`        | EncryptionKey (32-byte base64), Issuer ("TicketStar")                              |
| `Redis`      | ConnectionString                                                                   |
| `GoogleAuth` | ClientId                                                                           |
| `Cors`       | AllowedOrigins                                                                     |

All options validated at startup.

## Known Issues

1. **AuthIdentity.AccessToken/ProviderRefreshToken** not yet AES-256 encrypted — deferred
2. **WebAuthnCredential** DbSet exists but no controller/service — future feature
3. **RefreshRequest DTO** defined but unused (refresh reads from cookie)

---

**Last Updated:** 2026-03-01
