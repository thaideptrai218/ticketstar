# Phase 5: Protected Routes & Layout Integration

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 1.5h

Route protection wrapper, authenticated layout with user menu, redirect logic.

## Context Links
- [Phase 2](/plans/260301-1601-auth-frontend/phase-02-auth-context-and-provider.md)

## Requirements

### Functional
- `ProtectedRoute` wrapper: shows loading during auth check, redirects to `/login?returnUrl=...` if unauthenticated
- Authenticated app layout with user avatar/dropdown (logout, settings)
- After login, redirect to `returnUrl` query param or `/`
- Redirect authenticated users away from /login, /register

## Related Code Files

### Create
- `frontend/src/components/auth/protected-route.tsx`
- `frontend/src/components/auth/user-menu.tsx` — avatar dropdown with logout
- `frontend/src/app/(app)/layout.tsx` — authenticated layout

### Modify
- `frontend/src/components/auth/login-form.tsx` — use returnUrl on redirect
- `frontend/src/app/(auth)/layout.tsx` — redirect if already authenticated

## Implementation Steps

1. Create `protected-route.tsx`:
   - Uses `useAuth()` — if loading show skeleton, if not authenticated redirect
   - Preserves current URL as returnUrl param

2. Create `user-menu.tsx`:
   - Avatar with dropdown: user email, role badge, "Cai dat" link, "Dang xuat" button
   - Uses shadcn DropdownMenu (may need to install)

3. Create `(app)/layout.tsx`:
   - Wraps children in ProtectedRoute
   - Header with logo + user menu
   - Main content area

4. Update auth layout:
   - If `isAuthenticated && !isLoading`, redirect to `/`

5. Update login-form:
   - After successful auth, `router.push(returnUrl || "/")`

## Todo List
- [ ] Create protected-route component
- [ ] Create user-menu dropdown
- [ ] Create (app) layout
- [ ] Add auth redirect in (auth) layout
- [ ] Handle returnUrl in login flow

## Success Criteria
- Unauthenticated users redirected to /login from protected routes
- Authenticated users redirected away from /login, /register
- returnUrl preserved through login flow
- User menu shows email and logout works
