# Phase 04: Role-Based Routing

**Priority:** P1 (Security critical)
**Status:** Pending
**Estimated Effort:** 30 minutes
**Dependencies:** Phase 01, Phase 02, Phase 03

## Context Links

- Protected route: `frontend/src/components/auth/protected-route.tsx`
- Auth context: `frontend/src/contexts/auth-context.tsx`
- Dashboard layout: `frontend/src/app/(dashboard)/layout.tsx`

## Overview

Implement role-based route protection using Next.js middleware and enhanced protected route components. Ensure users can only access routes appropriate for their role (Admin/Organizer/Staff/Attendee).

## Key Insights

1. **Two-Layer Protection**:
   - **Middleware**: Server-side redirect for protected routes
   - **Component**: Client-side fallback + role checking

2. **Route Groups**: Use Next.js route groups for organization:
   - `(dashboard)` - All authenticated users
   - `(dashboard)/organizer` - Organizer only
   - `(dashboard)/staff` - Staff only
   - `(dashboard)/admin` - Admin only

3. **Middleware Approach**: Next.js 15 supports middleware for route protection. More secure than client-only checks.

4. **Existing ProtectedRoute**: Already handles auth check. Extend with role verification.

## Requirements

### Functional Requirements
- Middleware redirects unauthenticated users to login
- Middleware redirects unauthorized users to 403 or home
- Role-protected routes check user role
- Preserve returnUrl for post-login redirect

### Non-Functional Requirements
- Fast middleware execution (no DB calls)
- Clear error messages for unauthorized access
- Support public routes (landing, auth pages)

## Architecture

```
Request → Middleware (check auth + role) → Route Handler
                                              ↓
                                         ProtectedRoute (client fallback)
```

## Related Code Files

### Files to Create
- `frontend/src/middleware.ts` - Route protection middleware
- `frontend/src/components/auth/role-protected-route.tsx` - Role guard component
- `frontend/src/app/(dashboard)/organizer/layout.tsx` - Organizer layout wrapper
- `frontend/src/app/(dashboard)/staff/layout.tsx` - Staff layout wrapper
- `frontend/src/app/(dashboard)/admin/layout.tsx` - Admin layout wrapper
- `frontend/src/app/not-found.tsx` - Custom 404 page
- `frontend/src/app/(dashboard)/forbidden/page.tsx` - 403 forbidden page

### Files to Modify
- `frontend/src/components/auth/protected-route.tsx` - Extend with role check

## Implementation Steps

1. **Create Middleware**
   ```typescript
   // frontend/src/middleware.ts
   import { NextResponse } from 'next/server';
   import type { NextRequest } from 'next/server';

   // Public routes that don't require auth
   const publicRoutes = [
     '/',
     '/login',
     '/register',
     '/magic-link',
     '/magic-link/verify',
   ];

   // Role-based route mapping
   const roleRoutes: Record<string, string[]> = {
     '/dashboard/organizer': ['Organizer', 'Admin'],
     '/dashboard/staff': ['Staff', 'Admin'],
     '/dashboard/admin': ['Admin'],
   };

   export function middleware(request: NextRequest) {
     const { pathname } = request.nextUrl;

     // Allow public routes
     if (publicRoutes.some(route => pathname.startsWith(route))) {
       return NextResponse.next();
     }

     // Check for auth token in cookie
     const token = request.cookies.get('ts_at')?.value;

     if (!token) {
       // No token -> redirect to login with returnUrl
       const url = request.nextUrl.clone();
       url.pathname = '/login';
       url.searchParams.set('returnUrl', pathname);
       return NextResponse.redirect(url);
     }

     // For role-protected routes, decode token and check role
     const protectedRoute = Object.keys(roleRoutes).find(route =>
       pathname.startsWith(route)
     );

     if (protectedRoute) {
       try {
         // Simple JWT decode (no verification needed - backend does that)
         const payload = JSON.parse(
           Buffer.from(token.split('.')[1], 'base64').toString()
         );

         const userRole = payload[
           'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
         ] as string;

         const allowedRoles = roleRoutes[protectedRoute];

         if (!allowedRoles.includes(userRole)) {
           // User doesn't have required role -> 403
           const url = request.nextUrl.clone();
           url.pathname = '/forbidden';
           return NextResponse.redirect(url);
         }
       } catch {
         // Invalid token -> redirect to login
         const url = request.nextUrl.clone();
         url.pathname = '/login';
         url.searchParams.set('returnUrl', pathname);
         return NextResponse.redirect(url);
       }
     }

     return NextResponse.next();
   }

   export const config = {
     matcher: [
       /*
        * Match all request paths except:
        * - api routes
        * - _next/static (static files)
        * - _next/image (image optimization files)
        * - favicon.ico (favicon file)
        * - public files
        */
       '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
     ],
   };
   ```

2. **Create Role Protected Route Component**
   ```typescript
   // frontend/src/components/auth/role-protected-route.tsx
   "use client";

   import { usePathname, useRouter } from "next/navigation";
   import { useEffect } from "react";
   import { Skeleton } from "@/components/ui/skeleton";
   { useAuth } from "@/contexts/auth-context";

   interface RoleProtectedRouteProps {
   children: React.ReactNode;
   allowedRoles: string[];
   }

   export function RoleProtectedRoute({
     children,
     allowedRoles,
   }: RoleProtectedRouteProps) {
     const { user, isAuthenticated, isLoading } = useAuth();
     const router = useRouter();
     const pathname = usePathname();

     useEffect(() => {
     if (!isLoading) {
       if (!isAuthenticated) {
         // Not authenticated -> redirect to login
         router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
       } else if (user && !allowedRoles.includes(user.role)) {
         // Authenticated but wrong role -> redirect to forbidden
         router.replace('/forbidden');
       }
     }
   }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname]);

   if (isLoading) {
     return <RoleProtectedSkeleton />;
   }

   if (!isAuthenticated) {
     return null;
   }

   if (user && !allowedRoles.includes(user.role)) {
     return null;
   }

   return <>{children}</>;
   }

   function RoleProtectedSkeleton() {
     return (
       <div className="space-y-4 p-6">
         <Skeleton className="h-8 w-48" />
         <Skeleton className="h-4 w-full" />
         <Skeleton className="h-4 w-3/4" />
       </div>
     );
   }
   ```

3. **Create Role-Specific Layouts**
   ```typescript
   // frontend/src/app/(dashboard)/organizer/layout.tsx
   import { RoleProtectedRoute } from "@/components/auth/role-protected-route";

   export default function OrganizerLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     return (
       <RoleProtectedRoute allowedRoles={["Organizer", "Admin"]}>
         {children}
       </RoleProtectedRoute>
     );
   }

   // Similar for staff and admin layouts
   ```

4. **Create Forbidden Page**
   ```typescript
   // frontend/src/app/(dashboard)/forbidden/page.tsx
   import Link from "next/link";
   { AlertTriangle, Home } from "lucide-react";
   import { Button } from "@/components/ui/button";

   export default function ForbiddenPage() {
     return (
       <div className="flex min-h-screen items-center justify-center bg-[#faf8f5]">
         <div className="max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-stone-200">
           <div className="flex justify-center">
             <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
               <AlertTriangle className="size-8 text-red-600" />
             </div>
           </div>

           <div className="text-center space-y-2">
             <h1 className="text-2xl font-semibold text-stone-900">
               Truy cập bị từ chối
             </h1>
             <p className="text-sm text-stone-500">
               Bạn không có quyền truy cập trang này. Nếu bạn nghĩ đây là lỗi,
               vui lòng liên hệ quản trị viên.
             </p>
           </div>

           <div className="flex flex-col gap-3">
             <Button asChild className="bg-amber-800 hover:bg-amber-900">
               <Link href="/dashboard">
                 <Home className="mr-2 size-4" />
                 Về trang chủ
               </Link>
             </Button>
             <Button asChild variant="outline">
               <Link href="/">Về trang sự kiện</Link>
             </Button>
           </div>
         </div>
       </div>
     );
   }
   ```

5. **Update Existing ProtectedRoute** (keep for backward compatibility)
   ```typescript
   // frontend/src/components/auth/protected-route.tsx
   // No changes needed - already handles auth check
   // Role checks now handled by RoleProtectedRoute
   ```

## Todo List

- [ ] Create `middleware.ts` with route protection logic
- [ ] Create `role-protected-route.tsx` component
- [ ] Create organizer layout with role guard
- [ ] Create staff layout with role guard
- [ ] Create admin layout with role guard
- [ ] Create 403 forbidden page
- [ ] Test middleware redirects unauthenticated users
- [ ] Test role guards block unauthorized access

## Success Criteria

- [ ] Unauthenticated users redirected to login
- [ ] returnUrl preserved and used after login
- [ ] Admin can access all dashboard routes
- [ ] Organizer blocked from admin/staff routes
- [ ] Staff blocked from organizer/admin routes
- [ ] 403 page shows helpful message
- [ ] Middleware executes without errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT decode fails in middleware | Medium | Catch errors, redirect to login |
| Role claim name mismatch | High | Use exact claim name from backend |
| Middleware bypass in dev | Low | Test in production-like env |
| Token rotation breaks middleware | Low | Cookie read works with rotation |

## Security Considerations

**IMPORTANT**: Middleware is UX optimization, NOT security enforcement.

- Frontend checks can be bypassed (curl, Postman, browser console)
- Backend MUST enforce roles with `[Authorize(Roles = "Admin")]`
- Never trust frontend for authorization

Backend already has role-based attributes. This phase just improves UX.

## Next Steps

Once routing complete, proceed to **Phase 05: Error Handling** for polish.
