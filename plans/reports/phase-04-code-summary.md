# Phase 4 — Frontend Auth & Layout: Code Summary

**Commit:** `ec50f69` | **Scope:** Frontend + Docs | **+1639 / -339 lines**

---

## What Was Done

Migrated all auth calls from direct backend hits to Next.js proxy routes. JWT tokens are now fully httpOnly — browser JS never touches raw tokens. Added role-based middleware and layouts for all 4 user roles.

---

## New: Auth Proxy Routes (`frontend/src/app/api/auth/`)

13 route handlers, all proxying to `.NET backend /api/auth/*`:

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Email/password → sets `ts_at` + `refresh_token` cookies |
| `/api/auth/register` | POST | Register → same cookie setup |
| `/api/auth/google` | POST | Google ID token → cookies |
| `/api/auth/magic-link/request` | POST | Send magic link email |
| `/api/auth/magic-link/verify` | POST | Verify token → cookies |
| `/api/auth/refresh` | POST | Rotate refresh token → new cookies |
| `/api/auth/logout` | POST | Clear both cookies |
| `/api/auth/revoke-all` | POST | Invalidate all sessions |
| `/api/auth/me` | GET | Decode `ts_at` cookie → return `AuthUser` (no DB call) |
| `/api/auth/mfa/challenge` | POST | Complete MFA → access token |
| `/api/auth/mfa/setup` | POST | Generate TOTP QR |
| `/api/auth/mfa/verify-setup` | POST | Confirm TOTP → recovery codes |
| `/api/auth/mfa/disable` | POST | Disable MFA |

**Shared helper** `_proxy-helpers.ts`: `proxyToBackend()`, `copySetCookieHeaders()`, `parseJson()`, `errorResponse()`. Cookie config: `httpOnly: true, sameSite: lax, path: /`, access 5min, refresh 7d.

---

## New: Middleware (`frontend/src/middleware.ts`)

JWT-decode-based route guards — **no network call**, runs at Edge:

```
/organizer/* → ["Organizer", "Admin"]
/admin/*     → ["Admin"]
/attendee/*  → ["Attendee", "Admin"]
/staff/*     → ["Staff", "Admin", "Organizer"]
```

- Expired token → redirect to `/login?returnUrl=...`
- Wrong role → redirect to `/unauthorized`
- No token on protected route → redirect to `/login?returnUrl=...`
- `returnUrl` validated: must start with `/` (not `//`) to prevent open redirect

---

## New: Typed API Clients

| File | Use | Key behavior |
|---|---|---|
| `lib/api-client.ts` | Browser | `credentials: include`, auto-refresh on 401 with shared promise queue (prevents concurrent refresh race) |
| `lib/api-server.ts` | Server Components | Reads `cookies()` from `next/headers`, forwards as `Cookie` header, `cache: no-store` |

---

## New: Role-Based Layouts

| Route Group | Layout | Guard |
|---|---|---|
| `(auth)` | Centered card, no nav | None (login/register) |
| `(app)` | Sticky header + UserMenu | `ProtectedRoute` component |
| `(organizer)` | AppSidebar with nav items | Middleware |
| `(admin)` | AppSidebar with admin nav | Middleware |
| `(staff)` | Minimal + back button | Middleware |
| `(attendee)` | Public layout + user menu | Middleware |

---

## Auth Context Changes

`contexts/auth-context.tsx` refactored:
- Hydrates user via `GET /api/auth/me` on mount (reads httpOnly cookie server-side)
- No longer reads cookies client-side (was impossible for httpOnly anyway)
- `logout()` calls proxy then clears local state
- `refreshUser()` re-fetches `/api/auth/me`

---

## Key Security Points

- `ts_at` cookie is httpOnly → XSS cannot steal tokens
- Middleware is **UX guard only** — backend validates on every API call
- CSRF: `sameSite: lax` covers standard browser flows
- Middleware does not verify JWT signature (no JWKS in Edge Runtime) — acceptable by design
