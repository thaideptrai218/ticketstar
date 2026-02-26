# Phase 4 — Frontend Auth & Layout

## Context Links
- [Plan Overview](plan.md) | [Frontend Research](research/researcher-02-frontend.md)

## Overview
- **Priority:** P1 | **Status:** pending | **Effort:** 8h
- **Depends on:** Phase 1
- Next.js auth proxy routes, middleware route protection, layouts, API client, React Query setup

## Key Insights
- httpOnly cookies for JWT — Next.js route handlers proxy auth to .NET backend
- middleware.ts decodes JWT for route guards (no network call, edge-fast)
- Route groups: `(public)`, `(auth)`, `(attendee)`, `(organizer)`, `(staff)`, `(admin)`

## Requirements
- Auth proxy routes (login, logout, refresh, google, magic-link)
- httpOnly cookie management
- middleware.ts role-based route protection
- Root layout with providers (React Query, Toaster)
- Public layout (navbar + footer)
- Auth layout (minimal, centered)
- Dashboard layout (sidebar for organizer/admin)
- Typed API client with cookie forwarding
- Auth context/hook for client components

## Related Code Files
**Create:**
- `frontend/src/app/api/auth/google/route.ts` — proxy Google login
- `frontend/src/app/api/auth/magic-link/request/route.ts` — proxy magic link request
- `frontend/src/app/api/auth/magic-link/verify/route.ts` — proxy verify + set cookies
- `frontend/src/app/api/auth/refresh/route.ts` — proxy refresh + rotate cookies
- `frontend/src/app/api/auth/logout/route.ts` — clear cookies
- `frontend/src/app/layout.tsx` — root layout with providers
- `frontend/src/app/(public)/layout.tsx` — navbar + footer
- `frontend/src/app/(auth)/layout.tsx` — centered auth layout
- `frontend/src/app/(auth)/login/page.tsx` — login page (Google + Magic Link)
- `frontend/src/app/(attendee)/layout.tsx`
- `frontend/src/app/(organizer)/layout.tsx` — sidebar layout
- `frontend/src/app/(staff)/layout.tsx`
- `frontend/src/app/(admin)/layout.tsx` — sidebar layout
- `frontend/src/lib/api-client.ts` — typed fetch wrapper
- `frontend/src/lib/api-server.ts` — server-side fetch with cookie forwarding
- `frontend/src/lib/auth.ts` — token decode, role helpers
- `frontend/src/hooks/use-auth.ts` — auth context hook
- `frontend/src/types/auth.ts` — User, TokenPayload, Role types
- `frontend/src/types/api.ts` — ApiResponse<T>, PagedResult<T>
- `frontend/src/components/providers/query-provider.tsx` — React Query provider
- `frontend/src/components/layout/navbar.tsx`
- `frontend/src/components/layout/footer.tsx`
- `frontend/src/components/layout/sidebar.tsx`
- `frontend/src/middleware.ts` — route protection

## Implementation Steps

### 1. Types
1. Define `ApiResponse<T>`, `PagedResult<T>` matching backend
2. Define `User { id, email, fullName, roles }`, `TokenPayload`, `Role` enum

### 2. API Client
1. `api-client.ts` — browser-side: `credentials: 'include'`, base URL from env
2. `api-server.ts` — server-side: reads `cookies()` from `next/headers`, forwards as `Cookie` header
3. Both share typed `apiFetch<T>(path, init)` signature
4. Handle 401 → trigger refresh flow (client-side interceptor)

### 3. Auth Proxy Routes
1. `POST /api/auth/google` → forward to backend `/api/auth/google-login`, set cookies from response
2. `POST /api/auth/magic-link/request` → forward email to backend
3. `POST /api/auth/magic-link/verify` → forward token, set cookies from response
4. `POST /api/auth/refresh` → forward refresh token cookie to backend, set new cookies
5. `POST /api/auth/logout` → call backend logout, clear cookies
6. Cookie settings: `httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'`
7. Access token cookie: maxAge 15min; refresh token cookie: maxAge 7d

### 4. Middleware
1. Copy pattern from research report
2. Route matchers: `/attendee/*`, `/organizer/*`, `/staff/*`, `/admin/*`
3. Decode JWT, check roles array against required roles
4. Redirect to `/login` if no token, `/unauthorized` if wrong role
5. No network calls in middleware — decode only

### 5. Auth Hook
1. `useAuth()` — React context providing: `user`, `isAuthenticated`, `login()`, `logout()`, `roles`
2. On mount: decode access token cookie (client-readable JWT payload via `jwt-decode`)
3. Note: cookie is httpOnly so can't read it client-side — instead, store user info in a non-httpOnly cookie or fetch `/api/auth/me` endpoint

**Revised approach:** Add `GET /api/auth/me` route handler that reads httpOnly cookie, decodes, returns user info. `useAuth` calls this on mount via React Query.

### 6. Root Layout
1. `<html>` with `<body>` wrapper
2. `QueryProvider` (React Query)
3. `Toaster` (Sonner)
4. Font setup (Inter via next/font)

### 7. Public Layout
1. `Navbar`: logo, nav links (Events), auth buttons (Login / user menu)
2. `Footer`: minimal links, copyright
3. Responsive: mobile hamburger menu via Sheet component

### 8. Auth Layout
1. Centered card layout, no navbar/footer
2. Used for `/login`, `/register`

### 9. Dashboard Layouts
1. Organizer/Admin: sidebar with nav items + main content area
2. Staff: minimal layout with back button
3. Attendee: public layout + user menu

## Todo List
- [ ] Define TypeScript types (auth, api)
- [ ] Create api-client.ts (browser) and api-server.ts (server)
- [ ] Create all auth proxy route handlers
- [ ] Create middleware.ts with role-based guards
- [ ] Create QueryProvider wrapper
- [ ] Create root layout with providers
- [ ] Create public layout (navbar + footer)
- [ ] Create auth layout
- [ ] Create dashboard layouts (organizer, admin, staff, attendee)
- [ ] Create login page (Google + Magic Link)
- [ ] Create useAuth hook + /api/auth/me endpoint
- [ ] Verify: unauthenticated user redirected from protected routes
- [ ] Verify: wrong role redirected to /unauthorized

## Success Criteria
- Google login → cookies set → redirected to homepage → navbar shows user
- Magic link request → verify → logged in
- Protected routes redirect unauthenticated users
- Wrong role → /unauthorized page
- Token refresh transparent to user
- All layouts render correctly (mobile + desktop)

## Risk Assessment
- **Cookie domain in dev:** ensure cookies work on localhost (sameSite: lax)
- **Token refresh race:** use React Query retry + 401 interceptor carefully
- **JWT decode in middleware:** no verification (signature check) — acceptable since backend validates on API call

## Security Considerations
- httpOnly cookies prevent XSS token theft
- CSRF: sameSite=lax + verify origin header on mutations
- Never expose tokens to client JS
- Middleware is a UX guard only — backend enforces real auth

## Next Steps
- Phases 5-8 build pages on top of this foundation
