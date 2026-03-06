# TicketStar - System Architecture

## Architecture Overview

TicketStar uses a **layered architecture** pattern with clear separation of concerns. The backend follows Clean Architecture principles (API/Application/Domain/Infrastructure layers), while the frontend uses Next.js 15 App Router with server and client components.

## Backend Architecture (.NET 8)

### Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      TicketStar.API                         │
│  - Controllers (Endpoints)                                  │
│  - Middleware (TokenBlacklist, RateLimiting, etc.)          │
│  - RateLimiting (Redis-backed)                              │
│  - MFA Controller                                           │
│  - JWT Authentication & Cookie Extensions                  │
│  - Program.cs (Configuration)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                 TicketStar.Application                      │
│  - Services (Business Logic)                                │
│  - Security Services (Argon2, SHA-256, CSPRNG)              │
│  - MFA Service & Crypto Helper                              │
│  - Token Blacklist & Grace Period Cache                     │
│  - DTOs/Mappings, Validation, Business Rules                │
│  - Options Pattern (JwtOptions, MfaOptions, RedisOptions)   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                   TicketStar.Domain                         │
│  - Entities (Domain Models)                                 │
│  - MFA Recovery Codes, Auth Sessions                        │
│  - Value Objects                                            │
│  - Interfaces (Repository, Service)                         │
│  - Domain Events                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              TicketStar.Infrastructure                      │
│  - EF Core DbContext                                        │
│  - Repository Implementations                               │
│  - RedisService (low-level Redis operations)                │
│  - RabbitMQ Consumers (MassTransit)                         │
│  - External Services (SePay, Google OAuth)                  │
└─────────────────────────────────────────────────────────────┘
```

### Project Dependencies

```
TicketStar.API
    ↓
TicketStar.Application
    ↓
TicketStar.Domain
    ↑
TicketStar.Infrastructure
```

- **API** depends on Application
- **Application** depends on Domain
- **Infrastructure** depends on Domain (Domain is core, no dependencies)
- **Domain** has zero dependencies (pure C# entities/interfaces)

### Solution Structure

```
backend/
├── TicketStar.sln
├── src/
│   ├── TicketStar.API/
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   └── MfaController.cs
│   │   ├── Middleware/
│   │   │   └── TokenBlacklistMiddleware.cs
│   │   ├── RateLimiting/
│   │   │   ├── RedisRateLimiter.cs
│   │   │   └── RedisRateLimiterPolicy.cs
│   │   ├── Extensions/
│   │   │   └── CookieExtensions.cs
│   │   ├── Filters/
│   │   └── Program.cs
│   ├── TicketStar.Application/
│   │   ├── Services/
│   │   │   ├── Security/
│   │   │   │   ├── Argon2PasswordHasher.cs
│   │   │   │   ├── Sha256TokenHasher.cs
│   │   │   │   └── CryptoRandomService.cs
│   │   │   ├── MfaService.cs
│   │   │   ├── MfaCryptoHelper.cs
│   │   │   ├── RedisTokenBlacklist.cs
│   │   │   ├── RedisGracePeriodCache.cs
│   │   │   └── SessionService.cs
│   │   ├── Interfaces/
│   │   │   ├── IMfaService.cs
│   │   │   ├── ITokenBlacklist.cs
│   │   │   ├── IGracePeriodCache.cs
│   │   │   ├── ISessionService.cs
│   │   │   ├── ISecureRandom.cs
│   │   │   ├── IPasswordHasher.cs
│   │   │   └── ITokenHasher.cs
│   │   ├── Options/
│   │   │   ├── MfaOptions.cs
│   │   │   └── RedisOptions.cs
│   │   ├── DTOs/
│   │   ├── Mappings/
│   │   └── Validation/
│   ├── TicketStar.Domain/
│   │   ├── Entities/
│   │   │   ├── MfaRecoveryCode.cs
│   │   │   ├── AuthSession.cs
│   │   │   ├── SecurityEvent.cs
│   │   │   └── User.cs
│   │   ├── ValueObjects/
│   │   ├── Interfaces/
│   │   └── Enums/
│   └── TicketStar.Infrastructure/
│       ├── Data/
│       │   └── AppDbContext.cs
│       ├── Repositories/
│       │   └── MfaRecoveryCodeRepository.cs
│       ├── Cache/
│       │   └── RedisService.cs
│       ├── Messaging/
│       └── ExternalServices/
└── tests/
    └── TicketStar.Tests/
```

## Frontend Architecture (Next.js 15)

### Auth Proxy Layer (Phase 4)

Browser requests never call the .NET backend directly for auth. Instead:

```
Browser          Next.js            .NET Backend
  │              Proxy Routes       API
  ├─ POST /api/auth/login ──────→ POST /auth/login-email
  │  (credentials: 'include')       │
  │                                 ├─ Validate password
  │                                 ├─ Generate JWT
  │                                 ├─ Set httpOnly cookie
  │  ←──────────── HttpOnly Cookie ──┤ (Set-Cookie: ts_at)
  │  (ts_at in secure httpOnly)      │
  │
  ├─ Next request with ts_at ──→ POST /api/auth/me
  │  (auto-sent by browser)         │
  │  Proxy reads ts_at cookie        ├─ Decode JWT
  │  Forwards as Bearer:             ├─ Return user info
  │  Authorization: Bearer <ts_at>   │
  │  ←──────────── User data ────────┘
```

**Key Points:**
- Client-side JS never sees or touches tokens (httpOnly)
- Proxy routes (`/api/auth/*`) handle cookie forwarding
- Access token (`ts_at`) is server-set via Set-Cookie header
- Refresh token lives in httpOnly cookie with SameSite=Strict, Path=/api/auth
- Auto-refresh on 401 via `apiFetch()` concurrent-safe queue

### App Router Structure

```
frontend/
├── app/
│   ├── (auth)/                   # Auth route group (public)
│   │   ├── login/
│   │   ├── register/
│   │   └── magic-link/verify/
│   ├── (app)/                    # Protected app routes
│   │   └── settings/security/    # MFA management
│   ├── (organizer)/              # Organizer dashboard (role-based)
│   ├── (admin)/                  # Admin dashboard (role-based)
│   ├── (attendee)/               # Attendee dashboard (role-based)
│   ├── (staff)/                  # Staff dashboard (role-based)
│   ├── api/auth/                 # Proxy route handlers
│   │   ├── login/route.ts
│   │   ├── register/route.ts
│   │   ├── me/route.ts
│   │   ├── refresh/route.ts
│   │   ├── logout/route.ts
│   │   ├── google/route.ts
│   │   └── mfa/...
│   ├── unauthorized/             # 403 error page
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── auth/                     # Auth forms + MFA components
│   ├── layout/                   # Navigation, sidebars
│   ├── events/                   # Event components
│   ├── tickets/                  # Ticket components
│   └── checkout/                 # Checkout flow
├── contexts/
│   └── auth-context.tsx          # User state + login/logout
├── hooks/                        # Custom React hooks
├── lib/
│   ├── api-client.ts             # Browser fetch (auto-refresh on 401)
│   ├── api-server.ts             # Server fetch (forwards cookies)
│   ├── auth/
│   │   ├── auth-api-client.ts    # Typed auth endpoint calls
│   │   ├── auth-token-manager.ts # Token lifecycle management
│   │   └── auth-types.ts         # Auth DTOs
│   └── utils.ts
├── types/
│   └── api.ts                    # ApiResponse<T>, PagedResult<T>
└── middleware.ts                 # Role-based route protection
```

### Authentication Data Flow

```
1. Login
   User submits email/password
        ↓
   POST /api/auth/login
        ↓
   Proxy: fetch POST /auth/login-email (backend)
        ↓
   Backend generates JWT, sets Set-Cookie: ts_at
        ↓
   Browser receives httpOnly cookie (ts_at)
        ↓
   AuthProvider.useEffect hydrates user from /api/auth/me

2. Subsequent API Calls
   apiFetch<T>(path) with credentials: 'include'
        ↓
   Browser auto-sends ts_at cookie
        ↓
   Backend validates JWT, returns data
        ↓
   If 401: apiFetch triggers concurrent-safe refresh
        ↓
   Proxy calls POST /api/auth/refresh (sends refresh_token cookie)
        ↓
   Backend rotates tokens, sets new ts_at
        ↓
   apiFetch retries original request with new ts_at
```

### Component Patterns

- **Server Components** (default): Data fetching, static content, use `apiFetchServer()`
- **Client Components** (`"use client"`): Interactive UI, forms, use `apiFetch()` or `authApi.*`
- **Route Handlers** (`app/api/auth/*`): Proxy to backend, manage cookies transparently
- **Middleware** (`middleware.ts`): JWT decode + role validation for protected routes

### API Client Architecture

**Browser-side (`apiFetch`):**
```typescript
// Calls backend directly with credentials: 'include'
// ts_at cookie auto-sent by browser
// Concurrent 401s share one refresh attempt
const user = await apiFetch<User>('/api/users/me');
```

**Server-side (`apiFetchServer`):**
```typescript
// Forwards cookies from incoming request to backend
// No retry logic (runs in server context)
const user = await apiFetchServer<User>('/api/users/me');
```

**Auth-specific (`authApi`):**
```typescript
// Typed calls to auth proxy endpoints
// Always use for login, register, MFA flows
const response = await authApi.login({ email, password });
```

## Infrastructure Architecture

### Docker Services

```yaml
Services:
  mysql:8.0      (Port 3307)
    - Database: ticketstar
    - Volume: mysql-data

  redis:7-alpine (Port 6380)
    - Password protected
    - Distributed locking

  rabbitmq:3     (Ports 5672, 15672)
    - Management UI: http://localhost:15672
    - Message broker for email stubs
```

### Service Communication

```
┌──────────────┐
│  Next.js     │───▶ .NET API (HTTP/JSON)
│  Frontend    │    │
└──────────────┘    │
                    ▼
┌─────────────────────────────────────┐
│         .NET API Layer              │
│  ┌───────────────────────────────┐  │
│  │ Controllers → Services        │  │
│  │     │                         │  │
│  │     ├──▶ Repository (MySQL)   │  │
│  │     │                         │  │
│  │     ├──▶ Cache (Redis)        │  │
│  │     │                         │  │
│  │     └──▶ Message Bus (RabbitMQ)│ │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Authentication Architecture

### JWT Flow (httpOnly Cookies + Next.js Proxy)

Phase 4 introduces a Next.js proxy layer that sits between the browser and the .NET backend:

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Browser   │     │   Next.js Proxy  │     │   .NET API  │
└──────┬──────┘     └────────┬─────────┘     └──────┬──────┘
       │                     │                      │
       │ 1. POST /api/auth/  │                      │
       │    login            │ 2. POST /auth/       │
       │    (no token in JS) │    login-email       │
       │────────────────────▶│─────────────────────▶│
       │                     │                      │
       │                     │ 3. Validate password │
       │                     │    Generate JWT (ts_at)
       │                     │    Set-Cookie: ts_at │
       │                     │◀─────────────────────│
       │ 4. Browser receives │                      │
       │    Set-Cookie:ts_at │                      │
       │◀────────────────────│ (httpOnly, Secure)   │
       │                     │                      │
       │ 5. GET /api/auth/me │                      │
       │    (ts_at cookie    │ 6. GET /api/users/me│
       │     auto-sent)      │    (Bearer <ts_at>) │
       │────────────────────▶│─────────────────────▶│
       │                     │                      │
       │ 7. User data        │ 8. User data         │
       │◀────────────────────│◀─────────────────────│
```

**Critical Design:**
- Browser never stores tokens in JS (XSS protection)
- Proxy routes at `/api/auth/*` forward to backend
- Cookies handled transparently by browser + Set-Cookie headers
- Backend always validates JWT on every authenticated request

### OAuth Flow (Google/Apple)

```
1. POST /auth/google → Redirect URL
2. Client redirects to Google
3. Google callback → Validate token
4. Create/link AuthIdentity
5. Generate JWT + Refresh Token
6. Set httpOnly cookie
```

### Refresh Token Rotation & Grace Period

```
Login → Access Token (5min) + Refresh Token (7d)
  ↓
Access expires
  ↓
Refresh request → Validate token → Rotate pair
  ↓
Token family tracking → Reuse detection → Revoke all sessions (security)
  ↓
Grace Period (10s window) → Allow multi-tab refresh without revocation
```

### Magic Link Flow

```
1. POST /auth/magic-link/request (email)
2. Generate token (CSPRNG, 32 bytes)
3. Store MagicLink in DB
4. Send link to email
5. POST /auth/magic-link/verify (token)
6. Validate & create session
```

### MFA (Multi-Factor Authentication) Flow

```
TOTP Setup:
1. POST /mfa/setup → Generate TOTP secret (AES-256 encrypted)
2. Return QR code for user to scan in authenticator app
3. POST /mfa/verify-setup (code) → Verify TOTP, generate recovery codes (SHA-256 hashed)
4. Return recovery codes to user (save securely)
5. MFA enabled on account

Login with MFA:
1. POST /auth/login-email (email + password)
2. If MFA enabled → Return MFA challenge token (5min expiry)
3. POST /mfa/verify-challenge (code or recovery code)
4. Return full JWT + Refresh Token pair

Recovery Code Flow:
1. User submits recovery code instead of TOTP
2. Constant-time comparison of hashed codes
3. Mark code as used, return JWT pair
4. Warn user to regenerate codes
```

### Security Services

- **Argon2PasswordHasher** - OWASP 2025 password hashing
- **Sha256TokenHasher** - Constant-time token verification
- **CryptoRandomService** - Cryptographically secure random generation
- **AES-256 Encryption** - Protect TOTP secrets
- **Account Lockout** - Failed login attempts → locked
- **Security Events** - Audit trail for all auth actions (MfaEnabled, MfaDisabled, etc.)

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Layered over CQRS** | Simpler for MVP, single models for read/write |
| **httpOnly cookies** | More secure than localStorage, XSS-resistant |
| **Redis distributed lock** | Prevents ticket overselling in high-concurrency scenarios |
| **MassTransit + RabbitMQ** | Real infra from day 1, stubbed consumers for dev |
| **App Router over Pages** | Next.js 15 default, better server/client component separation |
| **shadcn/ui** | Copy-paste components, full customization control |
| **SePay integration** | Real payment processing, no mocking in production path |

## Security Architecture

### Authentication Layers
1. **Next.js Middleware** (`middleware.ts`): Fast JWT decode (no sig verify), role-based redirect to `/login` or `/unauthorized`
2. **Next.js Route Handlers** (`/api/auth/*`): Proxy auth requests to backend, manage httpOnly cookies
3. **.NET API**: JWT validation + signature verification, refresh token rotation, token blacklisting
4. **Middleware (.NET)**: Token blacklist verification (Redis), rate limit enforcement

### Data Protection

- Passwords: Argon2id hashed (OWASP 2025 compliant)
- Refresh Tokens: SHA-256 hashed before storage (constant-time comparison)
- Magic Link Tokens: CSPRNG generated, SHA-256 hashed
- TOTP Secrets: AES-256 encrypted at rest
- Recovery Codes: SHA-256 hashed before storage
- QR Codes: HMAC-SHA256 signed payloads
- JWT: Signed with secret key, 5min expiry
- Email Changes: Verification required before update

### Distributed Rate Limiting

- **Redis-backed sliding window** per IP address
- **Login endpoint**: 10 attempts per 5 minutes
- **Register endpoint**: 5 attempts per 15 minutes
- **Refresh endpoint**: 30 attempts per 5 minutes
- **Magic link endpoint**: 5 attempts per 15 minutes
- **Fail-open strategy**: All Redis operations degrade gracefully

### Token Blacklisting & Grace Period

- **Redis timestamp-based blacklist** checked on every authenticated request
- **Token family tracking** for reuse detection
- **Revoke all sessions** on detected token reuse
- **10-second grace period** for multi-tab refresh scenarios
- **Fail-open strategy**: If Redis unavailable, gracefully allow requests

### Security Event Auditing

- All auth actions logged (MfaEnabled, MfaDisabled, MfaChallengeSuccess, LoginAttempt, etc.)
- Device fingerprinting: SHA-256(IP+UserAgent) for session tracking
- Centralized audit trail for compliance and investigation

---

**Last Updated:** 2026-03-06
**Phase:** 4 Complete - Frontend Auth & Layout
