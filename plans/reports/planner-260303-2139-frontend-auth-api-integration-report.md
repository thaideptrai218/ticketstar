# Frontend Auth & Layout API Integration - Plan Summary

**Plan ID:** 260303-2139-frontend-auth-api-integration
**Status:** Pending
**Created:** 2026-03-03
**Estimated Effort:** 3 hours

## Executive Summary

Comprehensive implementation plan for completing Phase 4 of TicketStar frontend development: API integration for auth flows, role-based dashboard layouts, and error handling. The UI components are 60% complete — this plan focuses on wiring functionality to the existing backend.

## What Exists ✅

### Completed Components
- Landing page (hero, features, how-it-works, footer, navigation)
- Auth pages (login, register, magic-link verify)
- Auth components (MFA challenge, MFA setup, recovery codes, Google login button)
- shadcn/ui integration (15+ components)
- Auth context provider (React Context API)
- Token manager (cookie-based storage with auto-refresh)
- Type definitions (DTOs matching backend)
- Auth API client (fetch wrapper with error handling)

### Backend Ready
- All auth endpoints implemented and documented
- JWT httpOnly cookie auth (5min access, 7d refresh)
- TOTP MFA with recovery codes
- Google OAuth integration
- Role-based authorization (Admin/Organizer/Staff/Attendee)

## Implementation Phases

### Phase 01: TanStack Query Setup (30min)
- Create QueryClient with sensible defaults
- Wrap app with QueryClientProvider
- Add React Query DevTools for debugging

**Deliverables:**
- `frontend/src/lib/query-client.ts`
- Updated `frontend/src/providers/app-providers.tsx`

### Phase 02: API Client Integration (45min)
- Verify all auth endpoints work end-to-end
- Test token refresh on 401 responses
- Test MFA flow (login → challenge → access token)
- Test Google OAuth redirect handling

**Deliverables:**
- `frontend/.env.local` with API URL
- Auth helper utilities (optional)
- Test verification checklist

### Phase 03: Dashboard Layout (45min)
- Create sidebar navigation with role-based links
- Build dashboard shell with header
- Create role-specific dashboard pages
- Mobile-responsive (collapsible sidebar)

**Deliverables:**
- `frontend/src/components/dashboard/sidebar.tsx`
- `frontend/src/components/dashboard/dashboard-shell.tsx`
- `frontend/src/app/(dashboard)/layout.tsx`
- Organizer, Staff, Admin dashboard pages

### Phase 04: Role-Based Routing (30min)
- Implement Next.js middleware for route protection
- Create RoleProtectedRoute component
- Build 403 forbidden page
- Test role-based access control

**Deliverables:**
- `frontend/src/middleware.ts`
- `frontend/src/components/auth/role-protected-route.tsx`
- `frontend/src/app/(dashboard)/forbidden/page.tsx`
- Role-specific layout wrappers

### Phase 05: Error Handling (30min)
- Create React error boundary
- Build API error alert component
- Implement centralized error handler
- Vietnamese error messages

**Deliverables:**
- `frontend/src/components/error-boundary.tsx`
- `frontend/src/lib/error-handler.ts`
- `frontend/src/components/ui/api-error-alert.tsx`
- `frontend/src/app/error.tsx`

## Success Criteria

- [ ] Google OAuth redirects correctly and logs user in
- [ ] Magic link form submits and processes response
- [ ] Protected routes redirect guests to login
- [ ] API client handles JWT cookies automatically
- [ ] Token refresh works transparently (5min expiry)
- [ ] Role-based routing prevents unauthorized access
- [ ] Dashboard layout shows role-appropriate navigation
- [ ] Error states display properly (429, 401, validation errors)

## Key Technical Decisions

### 1. Cookie-Based Auth
- **Decision**: Use httpOnly cookies for refresh tokens, memory + cookie for access tokens
- **Rationale**: More secure than localStorage, works with token rotation
- **Trade-off**: Slightly more complex than localStorage, but better security

### 2. React Context Over Redux
- **Decision**: Use React Context for auth state, TanStack Query for server state
- **Rationale**: Simpler (KISS), less boilerplate, sufficient for auth needs
- **Trade-off**: Less suitable for complex state, but auth is simple

### 3. Middleware + Component Protection
- **Decision**: Use Next.js middleware for server-side redirects, components as fallback
- **Rationale**: Faster UX, prevents flash of protected content
- **Trade-off**: Slight duplication, but defense-in-depth

### 4. Role-Based UI as UX Only
- **Decision**: Role-based navigation is convenience, not security
- **Rationale**: Frontend can be bypassed; backend is source of truth
- **Trade-off**: None - security handled by backend attributes

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Backend API differs from docs | High | Medium | Test each endpoint, update types |
| CORS issues | Medium | Low | Backend pre-configured |
| Token refresh race condition | Low | Low | Grace period caching implemented |
| Google OAuth config mismatch | Medium | Medium | Verify CLIENT_ID in env |
| JWT decode fails in middleware | Medium | Low | Catch errors, redirect login |

## File Structure

```
frontend/src/
├── lib/
│   ├── query-client.ts              # NEW: TanStack Query setup
│   ├── auth/
│   │   ├── auth-api-client.ts       # EXISTS: API endpoints
│   │   ├── auth-token-manager.ts    # EXISTS: Token storage
│   │   ├── auth-types.ts            # EXISTS: TypeScript types
│   │   └── auth-helpers.ts          # NEW: Helper functions
│   └── error-handler.ts             # NEW: Error handling
├── components/
│   ├── dashboard/
│   │   ├── sidebar.tsx              # NEW: Navigation
│   │   └── dashboard-shell.tsx      # NEW: Layout wrapper
│   ├── auth/
│   │   ├── protected-route.tsx      # EXISTS: Auth check
│   │   └── role-protected-route.tsx # NEW: Role check
│   ├── ui/
│   │   └── api-error-alert.tsx      # NEW: Error display
│   └── error-boundary.tsx           # NEW: React boundary
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx               # NEW: Dashboard shell
│   │   ├── organizer/
│   │   │   ├── layout.tsx           # NEW: Role guard
│   │   │   └── page.tsx             # NEW: Dashboard home
│   │   ├── staff/page.tsx           # NEW: Staff dashboard
│   │   ├── admin/page.tsx           # NEW: Admin dashboard
│   │   └── forbidden/page.tsx       # NEW: 403 page
│   ├── error.tsx                    # NEW: Error page
│   └── middleware.ts                # NEW: Route protection
├── providers/
│   └── app-providers.tsx            # MODIFY: Add QueryClient
└── contexts/
    └── auth-context.tsx             # EXISTS: Auth state
```

## Dependencies

### Internal Dependencies
- Phase 1: Environment setup (Complete)
- Phase 2: Database + Identity (Complete)
- Phase 3: Auth backend (Complete)

### External Dependencies
- Next.js 15.1.6 (installed)
- React 19.2.3 (installed)
- TanStack Query 5.90.21 (installed)
- @react-oauth/google 0.13.4 (installed)
- jwt-decode 4.0.0 (installed)
- sonner 2.0.7 (installed)
- shadcn/ui components (installed)

## Next Steps

1. **Start with Phase 01** - Foundation for all data fetching
2. **Then Phase 02** - Verify backend communication works
3. **Then Phase 03** - Build dashboard UI
4. **Then Phase 04** - Add security layer
5. **Finally Phase 05** - Polish error UX

## Unresolved Questions

1. **Error Logging**: Should we implement Sentry/LogRocket for production error tracking?
2. **Offline Support**: Do we need service worker for offline detection?
3. **Email Verification**: Backend sends verification emails — do we need a verify page?
4. **Password Reset**: Magic link used for password reset — is this sufficient?

## References

- Auth API docs: `docs/auth/frontend-api-reference.md`
- Backend architecture: `docs/auth/backend-architecture.md`
- Code standards: `docs/code-standards.md`
- Project overview: `docs/project-overview-pdr.md`

---

**Plan Location:** `/home/thaibeo/Code/ticketstar/plans/260303-2139-frontend-auth-api-integration/`

**Phase Files:**
- [plan.md](./plan.md) - Overview
- [phase-01-setup-tanstack-query.md](./phase-01-setup-tanstack-query.md)
- [phase-02-api-client-integration.md](./phase-02-api-client-integration.md)
- [phase-03-dashboard-layout.md](./phase-03-dashboard-layout.md)
- [phase-04-role-based-routing.md](./phase-04-role-based-routing.md)
- [phase-05-error-handling.md](./phase-05-error-handling.md)
