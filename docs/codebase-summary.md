# TicketStar - Codebase Summary

## Overview

TicketStar is a full-stack ticketing marketplace with:
- **.NET 8 Backend** (`backend/`) — Layered architecture (API/Application/Domain/Infrastructure)
- **Next.js 15 Frontend** (`frontend/`) — Server/client components, auth proxy, role-based routing
- **Infrastructure** (`docker-compose.yml`) — MySQL 8, Redis 7, RabbitMQ 3

This document summarizes the **frontend codebase** with focus on Phase 4 auth architecture.

---

## Frontend Directory Structure

```
frontend/src/
├── app/                              # Next.js 15 App Router
│   ├── (auth)/                       # Auth route group (public)
│   │   ├── layout.tsx                # Auth layout (no sidebar)
│   │   ├── login/page.tsx            # Email/password + Google OAuth login
│   │   ├── register/page.tsx         # User registration
│   │   └── magic-link/
│   │       └── verify/page.tsx       # Magic link verification
│   │
│   ├── (app)/                        # Protected app routes
│   │   └── settings/
│   │       └── security/
│   │           └── page.tsx          # MFA setup/disable page
│   │
│   ├── (organizer)/                  # Role-based: Organizer + Admin
│   │   └── ... (planned)
│   │
│   ├── (admin)/                      # Role-based: Admin only
│   │   └── ... (planned)
│   │
│   ├── (attendee)/                   # Role-based: Attendee + Admin
│   │   └── ... (planned)
│   │
│   ├── (staff)/                      # Role-based: Staff + Admin + Organizer
│   │   └── ... (planned)
│   │
│   ├── api/
│   │   └── auth/                     # Proxy to backend auth endpoints
│   │       ├── _proxy-helpers.ts     # Cookie + bearer token helpers
│   │       ├── login/route.ts
│   │       ├── register/route.ts
│   │       ├── refresh/route.ts
│   │       ├── logout/route.ts
│   │       ├── me/route.ts           # Current user endpoint
│   │       ├── google/route.ts
│   │       ├── magic-link/
│   │       │   ├── request/route.ts
│   │       │   └── verify/route.ts
│   │       ├── revoke-all/route.ts
│   │       └── mfa/
│   │           ├── setup/route.ts
│   │           ├── verify-setup/route.ts
│   │           ├── challenge/route.ts
│   │           └── disable/route.ts
│   │
│   ├── unauthorized/                 # 403 error page
│   │   └── page.tsx
│   │
│   ├── layout.tsx                    # Root layout (auth provider, sidebar)
│   └── page.tsx                      # Landing page
│
├── components/
│   ├── auth/                         # Auth-specific components
│   │   ├── login-form.tsx            # Email/password form
│   │   ├── register-form.tsx         # Registration form
│   │   ├── google-login-button.tsx   # Google OAuth button
│   │   ├── magic-link-request-form.tsx
│   │   ├── mfa-challenge-form.tsx    # TOTP/recovery code form
│   │   ├── mfa-setup-wizard.tsx      # QR code + verify setup
│   │   ├── recovery-codes-display.tsx# MFA recovery codes
│   │   ├── password-input.tsx        # Reusable password field
│   │   ├── protected-route.tsx       # Route guard wrapper
│   │   ├── user-menu.tsx             # Profile + logout menu
│   │   └── ...
│   │
│   ├── ui/                           # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── toast.tsx
│   │   └── ... (15+ components)
│   │
│   ├── layout/                       # Layout components
│   │   ├── app-sidebar.tsx           # Dashboard sidebar (role-based)
│   │   └── ...
│   │
│   ├── events/                       # Event components (planned)
│   ├── tickets/                      # Ticket components (planned)
│   ├── checkout/                     # Checkout flow (planned)
│   └── ...
│
├── contexts/
│   └── auth-context.tsx              # Global auth state + user hydration
│
├── hooks/                            # Custom React hooks (planned)
│   └── ... (useQuery, useMutation, etc.)
│
├── lib/
│   ├── api-client.ts                 # Browser API fetch with auto-refresh
│   ├── api-server.ts                 # Server-side API fetch
│   │
│   ├── auth/
│   │   ├── auth-api-client.ts        # Typed auth endpoint calls
│   │   ├── auth-token-manager.ts     # Token lifecycle + storage
│   │   └── auth-types.ts             # Auth request/response DTOs
│   │
│   ├── utils.ts                      # Helper functions
│   └── ...
│
├── types/
│   ├── api.ts                        # ApiResponse<T>, PagedResult<T>
│   └── ... (API response types)
│
└── middleware.ts                     # Route protection + role-based redirect

```

---

## Key Architecture Components

### 1. Authentication Proxy Layer (`app/api/auth/*`)

All auth requests flow through Next.js proxy routes (never directly to backend):

```
Browser → POST /api/auth/login → Proxy → POST /auth/login-email → Backend
                                         ↓
                                    Sets Set-Cookie: ts_at
                                    (httpOnly, Secure, SameSite=Strict)
                                         ↓
                                    Returns response
                                         ↓
                                    Browser receives cookie
```

**Proxy Endpoints:**
| Route | Proxy To | Purpose |
|-------|----------|---------|
| `/api/auth/login` | `POST /auth/login-email` | Email/password login |
| `/api/auth/register` | `POST /auth/register` | New user registration |
| `/api/auth/google` | `POST /auth/google` | Google OAuth |
| `/api/auth/refresh` | `POST /auth/refresh` | Token refresh |
| `/api/auth/logout` | `POST /auth/logout` | Session termination |
| `/api/auth/me` | `GET /api/users/me` | Current user |
| `/api/auth/magic-link/request` | `POST /auth/magic-link/request` | Request magic link |
| `/api/auth/magic-link/verify` | `POST /auth/magic-link/verify` | Verify magic link |
| `/api/auth/mfa/setup` | `POST /mfa/setup` | MFA setup request |
| `/api/auth/mfa/verify-setup` | `POST /mfa/verify-setup` | Confirm TOTP setup |
| `/api/auth/mfa/challenge` | `POST /mfa/challenge` | TOTP verification |
| `/api/auth/mfa/disable` | `POST /mfa/disable` | Disable MFA |
| `/api/auth/revoke-all` | `POST /auth/revoke-all` | Logout all sessions |

**Cookie Management:**
- `ts_at` (Access Token): 5min expiry, httpOnly, Secure, SameSite=Strict
- `refresh_token`: 7d expiry, httpOnly, Secure, SameSite=Strict, Path=/api/auth

Browser never sees tokens in JavaScript (XSS protection).

### 2. Route Protection (`middleware.ts`)

Middleware runs on every request to protected routes (`/organizer`, `/admin`, `/attendee`, `/staff`):

```typescript
// middleware.ts logic:
1. Decode JWT from ts_at cookie (no signature verification — UX guard only)
2. Check expiration
3. Extract role claim
4. Validate role against required roles for route
5. Redirect to /login (if missing token) or /unauthorized (if insufficient role)
```

**Protected Routes:**
```
/organizer  → Requires: Organizer, Admin
/admin      → Requires: Admin
/attendee   → Requires: Attendee, Admin
/staff      → Requires: Staff, Admin, Organizer
```

### 3. Client-Side Fetching

**Browser Fetch (`lib/api-client.ts`):**
```typescript
apiFetch<T>(path, init)
  ├─ Calls backend directly: ${BASE_URL}${path}
  ├─ credentials: 'include' (auto-sends ts_at cookie)
  ├─ On 401: triggers concurrent-safe refresh
  │          (multiple parallel requests share one refresh attempt)
  └─ Retries on successful refresh
```

**Server Fetch (`lib/api-server.ts`):**
```typescript
apiFetchServer<T>(path, init)
  ├─ Server component only
  ├─ Forwards cookies from incoming request
  ├─ No retry logic (synchronous context)
  └─ No credentials header (cookies handled by HTTP layer)
```

**Auth API Client (`lib/auth/auth-api-client.ts`):**
```typescript
authApi.login(data)      // POST /api/auth/login
authApi.register(data)   // POST /api/auth/register
authApi.googleLogin(data) // POST /api/auth/google
authApi.mfaChallenge(data) // POST /api/auth/mfa/challenge
// ... etc
```

### 4. Auth State Management (`contexts/auth-context.tsx`)

```typescript
AuthProvider
  ├─ Hydrates user on mount via GET /api/auth/me
  │  (Reads ts_at cookie, no JS storage)
  │
  ├─ Provides:
  │  ├─ user: AuthUser | null
  │  ├─ isAuthenticated: boolean
  │  ├─ isLoading: boolean
  │  ├─ refreshUser(): Promise<void>
  │  └─ logout(): Promise<void>
  │
  └─ useAuth() hook for child components
```

### 5. Type Definitions

**API Response Wrapper (`types/api.ts`):**
```typescript
ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  errors?: Record<string, string[]>
}

PagedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}
```

**Auth Types (`lib/auth/auth-types.ts`):**
```typescript
AuthUser {
  id: string
  email: string
  displayName: string
  role: 'Admin' | 'Organizer' | 'Staff' | 'Attendee'
  mfaEnabled: boolean
}

LoginResponse {
  mfaRequired?: boolean
  mfaToken?: string
  user?: AuthUser
}

MfaSetupResponse {
  qrCode: string
  secret: string
}

// ... and all request DTOs
```

---

## Auth Flow Walkthrough

### Registration
```
1. User fills register-form.tsx
2. onSubmit → authApi.register({ email, password, displayName })
3. POST /api/auth/register (proxy)
4. Proxy forwards: POST /auth/register
5. Backend hashes password (Argon2), creates user
6. Backend generates JWT + refresh token
7. Sets Set-Cookie: ts_at in response
8. Browser receives httpOnly cookie
9. Component calls refreshUser() to hydrate AuthContext
10. Redirect to dashboard
```

### Login with MFA
```
1. User submits login-form.tsx
2. authApi.login({ email, password })
3. Backend responds:
   - If MFA disabled: { user, mfaRequired: false }
   - If MFA enabled: { mfaRequired: true, mfaToken }
4. If MFA required:
   - Show mfa-challenge-form.tsx
   - User enters TOTP code
5. authApi.mfaChallenge({ code, mfaToken })
6. Backend validates TOTP, sets ts_at cookie
7. AuthContext refreshes user
8. Redirect to dashboard
```

### Protected Route Access
```
1. User navigates to /organizer/dashboard
2. middleware.ts intercepts
3. Reads ts_at cookie
4. Decodes JWT (checks exp, extracts role)
5. Validates role against /organizer requirements (Organizer, Admin)
6. If valid: NextResponse.next() → Page renders
7. If invalid:
   - Missing token → Redirect /login?returnUrl=/organizer/dashboard
   - Insufficient role → Redirect /unauthorized
```

### Auto-Refresh on 401
```
1. apiFetch<T>('/api/events') called
2. Browser sends ts_at cookie
3. Backend responds 401 (token expired)
4. apiFetch detects 401
5. Calls attemptRefresh() (concurrent-safe queue)
6. POST /api/auth/refresh (sends refresh_token cookie)
7. Backend validates refresh token, rotates pair
8. Sets new ts_at cookie
9. apiFetch retries original request
10. Success!
```

---

## Security Guarantees

| Layer | Mechanism | Threat |
|-------|-----------|--------|
| **Browser → Proxy** | HttpOnly cookies | XSS token theft |
| **Proxy → Backend** | Signature validation (backend) | Token forgery |
| **Token Blacklist** | Redis (backend) | Revoked token reuse |
| **Refresh Rotation** | Token family tracking | Refresh token compromise |
| **Grace Period** | 10-second window (backend) | Multi-tab race conditions |
| **Rate Limiting** | Redis-backed sliding window | Brute force attacks |
| **Account Lockout** | 5 failed attempts → 15min lock | Password guessing |

---

## Development Status

| Feature | Status | Phase |
|---------|--------|-------|
| Auth pages (login, register, magic-link) | ✅ Complete | 4 |
| Auth proxy routes | ✅ Complete | 4 |
| Middleware + role-based routing | ✅ Complete | 4 |
| Auth context + user hydration | ✅ Complete | 4 |
| MFA setup/challenge UI | ✅ Complete | 4 |
| Browser API client (auto-refresh) | ✅ Complete | 4 |
| Server API client | ✅ Complete | 4 |
| shadcn/ui components | ✅ Complete | 4 |
| Landing page | ✅ Complete | 4 |
| **Event listing (marketplace)** | 🔄 Pending | 5 |
| **Organizer dashboard** | 🔄 Pending | 7 |
| **Admin dashboard** | 🔄 Pending | 8 |
| **Staff check-in page** | 🔄 Pending | 8 |
| **Attendee ticket page** | 🔄 Pending | 6 |

---

## File Size Reference

| File | LOC | Purpose |
|------|-----|---------|
| `auth-context.tsx` | 73 | Global auth state |
| `auth-api-client.ts` | 135 | Typed auth endpoints |
| `api-client.ts` | 75 | Browser fetch + refresh |
| `api-server.ts` | 50 | Server-side fetch |
| `auth-types.ts` | 80+ | Request/response DTOs |
| `middleware.ts` | 63 | Route protection |
| `_proxy-helpers.ts` | 20-30 | Cookie helpers |

---

## Next Steps (Phase 5+)

1. **Phase 3** — Backend API (events, orders, check-in)
2. **Phase 5** — Marketplace pages (event listing, detail, checkout)
3. **Phase 6** — Attendee dashboard (my tickets, QR display)
4. **Phase 7** — Organizer dashboard (event creation, stats)
5. **Phase 8** — Staff/Admin dashboards (check-in scanner, user mgmt)
6. **Phase 9** — E2E & unit tests

---

**Last Updated:** 2026-03-06
**Phase:** 4 Complete - Frontend Auth & Layout
