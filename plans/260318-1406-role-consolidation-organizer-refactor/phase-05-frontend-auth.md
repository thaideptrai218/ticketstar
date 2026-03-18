# Phase 5: Frontend Auth & Types Cleanup

## Overview
- **Priority:** P0
- **Status:** pending
- **Description:** Remove Staff role from frontend, update auth types, route guards, login flow

## Related Files

**Modify:**
- `frontend/src/lib/auth/auth-types.ts` — Remove Staff/Organizer from role type
- `frontend/src/lib/auth/auth-token-manager.ts` — Update role handling
- `frontend/src/components/auth/login-form.tsx` — Remove Staff redirect
- `frontend/src/components/auth/user-menu.tsx` — Remove Staff badge/label
- `frontend/src/components/auth/organizer-route.tsx` — Enforce isOrganizer check (not just auth)
- `frontend/src/components/layout/navigation-bar.tsx` — Update role-based nav
- `frontend/src/app/(admin)/layout.tsx` — Verify admin guard
- `frontend/src/proxy.ts` — Remove /staff/* proxy rules
- `frontend/src/types/organizer.ts` — Remove StaffMember/StaffEvent types, add Collaborator types

**Delete:**
- `frontend/src/components/auth/staff-route.tsx`
- `frontend/src/components/layout/staff-topnav.tsx`
- `frontend/src/app/(staff)/` — Entire directory (layout + all pages)

## Implementation Steps

### 1. Update AuthUser Type
```typescript
interface AuthUser {
  id: string;
  email: string;
  role: "User" | "Admin";  // Only 2 roles now
  isOrganizer: boolean;
  emailVerified: boolean;
  sessionId: string;
}
```

### 2. Update Login Redirect
```typescript
// Before: Admin → /admin, Staff → /staff, else → /home
// After: Admin → /admin, else → returnUrl or /home
if (role === "Admin") router.push("/admin/dashboard");
else router.push(returnUrl || "/home");
```

### 3. Update OrganizerRoute
```typescript
// Before: all authenticated users
// After: must be isOrganizer === true OR role === "Admin"
if (!user?.isOrganizer && user?.role !== "Admin") {
  router.push("/become-organizer");
  return null;
}
```

### 4. Add Collaborator Types
```typescript
export type CollaboratorPermissionLevel = "Viewer" | "Operator" | "Manager";
export type CollaboratorStatus = "Pending" | "Accepted" | "Declined" | "Revoked";

export interface Collaborator {
  id: string;
  userId?: string;
  email: string;
  fullName?: string;
  permissionLevel: CollaboratorPermissionLevel;
  status: CollaboratorStatus;
  invitedAt: string;
  acceptedAt?: string;
}

export interface CollaborationEvent {
  eventId: string;
  title: string;
  permissionLevel: CollaboratorPermissionLevel;
  status: string;
}
```

### 5. Update Proxy
- Remove `/staff/*` access rules
- Add collaborator endpoint routing if needed

### 6. Delete Staff Files
- Remove `staff-route.tsx`, `staff-topnav.tsx`, entire `(staff)/` directory
- Clean up any imports referencing deleted files

### 7. Update Navigation
- Remove Staff-specific nav items
- Keep "Tổ chức sự kiện" / "Tạo sự kiện" toggle based on isOrganizer

## Todo

- [ ] Update AuthUser interface (2 roles only)
- [ ] Update login-form.tsx redirect logic
- [ ] Update organizer-route.tsx (enforce isOrganizer)
- [ ] Add Collaborator types
- [ ] Update proxy.ts
- [ ] Update user-menu.tsx
- [ ] Update navigation-bar.tsx
- [ ] Delete staff-route.tsx
- [ ] Delete staff-topnav.tsx
- [ ] Delete (staff)/ directory
- [ ] Verify `just lint` passes
- [ ] Verify frontend compiles

## Success Criteria

- No "Staff" references in frontend code
- Login redirects correctly for User/Admin only
- OrganizerRoute properly gates on isOrganizer flag
- Frontend builds without errors
