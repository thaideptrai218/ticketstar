# Phase 2: Auth Context & Provider

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 2h

Auth state management: in-memory token storage, auto-refresh, JWT decoding, user info context.

## Context Links
- [Phase 1](/plans/260301-1601-auth-frontend/phase-01-auth-api-client-and-types.md)
- [JWT Claims](/docs/auth/frontend-api-reference.md#jwt-claims-decoded)

## Key Insights
- Access token stored in memory only (not localStorage) for XSS protection
- Token expires in 5min — schedule refresh ~30s before expiry
- On page load, attempt silent refresh to restore session
- Must handle concurrent refresh requests (race condition)

## Requirements

### Functional
- `useAuth()` hook: `user`, `isAuthenticated`, `isLoading`, `login()`, `logout()`, `setToken()`
- Decoded user from JWT: id, email, role, emailVerified
- Auto-refresh via setTimeout before expiry
- Silent refresh on initial load (restore session)
- Redirect to /login on refresh failure

### Non-functional
- No token leakage to localStorage/sessionStorage
- Singleton refresh promise to prevent concurrent refreshes

## Related Code Files

### Create
- `frontend/src/lib/auth/auth-token-manager.ts` — in-memory token, decode, refresh timer
- `frontend/src/contexts/auth-context.tsx` — React context + provider + useAuth hook
- `frontend/src/providers/app-providers.tsx` — wraps QueryClient + Auth + Toaster

### Modify
- `frontend/src/app/layout.tsx` — wrap children with AppProviders

## Implementation Steps

1. Create `auth-token-manager.ts`:
   - Module-level `let accessToken: string | null`
   - `getToken()`, `setToken(token)`, `clearToken()`
   - `decodeUser(token)` — uses jwt-decode, returns `AuthUser` type
   - `getExpiresIn(token)` — returns ms until expiry
   - `scheduleRefresh(onRefresh)` — setTimeout at expiry - 30s

2. Create `auth-context.tsx`:
   - `AuthContext` with `AuthUser | null`, `isAuthenticated`, `isLoading`
   - `AuthProvider`: on mount, call `refreshToken()` silently (restore session)
   - On successful auth (login/register/refresh), call `setToken()` + schedule refresh
   - `logout()`: call API, clear token, cancel scheduled refresh
   - Export `useAuth()` hook

3. Create `app-providers.tsx`:
   - `"use client"` component
   - Wraps: `QueryClientProvider` > `AuthProvider` > `Toaster` > children
   - QueryClient with sensible defaults (staleTime, retry)

4. Modify `layout.tsx`:
   - Import and wrap children with `<AppProviders>`

## Todo List
- [ ] Create auth-token-manager.ts
- [ ] Create auth-context.tsx with AuthProvider
- [ ] Create app-providers.tsx
- [ ] Update root layout.tsx
- [ ] Test: page reload preserves session via silent refresh

## Success Criteria
- `useAuth()` returns current user after login
- Page refresh restores session automatically
- Token refreshes before expiry
- Logout clears all auth state
