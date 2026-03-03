---
title: "Frontend Auth & Layout API Integration"
description: "Complete API integration for auth flows, role-based routing, and dashboard layout"
status: pending
priority: P1
effort: 3h
branch: main
tags: [frontend, auth, api-integration, tanstack-query, nextjs]
created: 2026-03-03
---

# Frontend Auth & Layout API Integration

**Status:** Pending
**Estimated Effort:** 3 hours
**Dependencies:** Phase 1 (Complete), Phase 2 (Complete), Phase 3 (60% complete)

## Overview

Complete the frontend auth API integration by wiring up existing auth components to the backend API, implementing role-based routing, and creating dashboard layouts. The UI components are mostly complete — this phase focuses on making them functional.

## What's Already Done ✅

- Landing page (hero, features, how-it-works, footer, navigation)
- Auth pages (login, register, magic-link verify)
- Auth components (MFA challenge, MFA setup, recovery codes, Google login, protected routes)
- shadcn/ui integration (15+ components)
- Auth context provider (React Context API)
- Token manager (cookie-based storage with auto-refresh)
- Type definitions (DTOs matching backend)
- Auth API client (fetch wrapper with error handling)

## Remaining Deliverables ⏳

1. **TanStack Query Integration** - Set up React Query for data fetching
2. **API Client Completion** - Verify all endpoints work end-to-end
3. **Dashboard Layout** - Role-based sidebar navigation
4. **Role-Based Routing** - Route guards for Admin/Organizer/Staff
5. **Error Handling** - Global error boundary and toast notifications
6. **Environment Config** - API URL configuration

## Phase Files

- [phase-01-setup-tanstack-query.md](./phase-01-setup-tanstack-query.md) - React Query setup
- [phase-02-api-client-integration.md](./phase-02-api-client-integration.md) - Verify API endpoints
- [phase-03-dashboard-layout.md](./phase-03-dashboard-layout.md) - Dashboard UI
- [phase-04-role-based-routing.md](./phase-04-role-based-routing.md) - Route guards
- [phase-05-error-handling.md](./phase-05-error-handling.md) - Error boundaries

## Success Criteria

- [ ] Google OAuth redirects correctly and logs user in
- [ ] Magic link form submits and processes response
- [ ] Protected routes redirect guests to login
- [ ] API client handles JWT cookies automatically
- [ ] Token refresh works transparently (5min expiry)
- [ ] Role-based routing prevents unauthorized access
- [ ] Dashboard layout shows role-appropriate navigation
- [ ] Error states display properly (429, 401, validation errors)

## Key Insights

1. **Auth Already Implemented**: The auth context, token manager, and API client are complete. Just need to verify they work with the actual backend.

2. **No Redux Needed**: React Context + TanStack Query handles all state management. Keep it simple (KISS).

3. **Cookie-Based Auth**: httpOnly cookies handle refresh tokens. Access tokens stored in memory + cookie for hydration. No localStorage.

4. **MFA Flow**: Login → MFA challenge (if enabled) → Access token. MFA setup wizard already built, just needs testing.

5. **Role-Based UI**: JWT contains role claim. Use it for:
   - Dashboard navigation items
   - Route protection (middleware or component-level)
   - Feature flags (show/hide UI)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend API differs from docs | High | Test each endpoint, update types as needed |
| CORS issues | Medium | Backend already configured, verify `credentials: "include"` |
| Token refresh race condition | Low | Already handled with grace period caching |
| Google OAuth config mismatch | Medium | Verify CLIENT_ID in env vars |

## Next Steps

1. Start with **Phase 01** (TanStack Query setup) — foundation for all data fetching
2. Then **Phase 02** (API client verification) — ensure backend communication works
3. Then **Phase 03** (Dashboard layout) — UI foundation for protected routes
4. Then **Phase 04** (Role-based routing) — security layer
5. Finally **Phase 05** (Error handling) — polish UX

## Related Code Files

### Existing Files (Read-Only)
- `frontend/src/lib/auth/auth-api-client.ts` - Auth API endpoints
- `frontend/src/lib/auth/auth-token-manager.ts` - Token storage/refresh
- `frontend/src/lib/auth/auth-types.ts` - TypeScript types
- `frontend/src/contexts/auth-context.tsx` - Auth state provider
- `frontend/src/components/auth/*` - All auth form components

### Files to Create
- `frontend/src/lib/query-client.ts` - TanStack Query setup
- `frontend/src/components/dashboard/sidebar.tsx` - Dashboard navigation
- `frontend/src/components/dashboard/dashboard-shell.tsx` - Layout wrapper
- `frontend/src/app/(dashboard)/layout.tsx` - Dashboard layout
- `frontend/src/middleware.ts` - Route protection middleware
- `frontend/src/app/(dashboard)/organizer/page.tsx` - Organizer dashboard
- `frontend/src/app/(dashboard)/staff/page.tsx` - Staff dashboard
- `frontend/src/app/(dashboard)/admin/page.tsx` - Admin dashboard

### Files to Modify
- `frontend/src/app/layout.tsx` - Add QueryClientProvider
- `frontend/.env.local` - Add API URL and Google Client ID
- `frontend/src/providers/app-providers.tsx` - Wrap providers correctly
