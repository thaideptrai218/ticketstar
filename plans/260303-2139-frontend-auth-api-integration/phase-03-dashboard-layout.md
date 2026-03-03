# Phase 03: Dashboard Layout

**Priority:** P1 (Core UI)
**Status:** Pending
**Estimated Effort:** 45 minutes
**Dependencies:** Phase 01, Phase 02

## Context Links

- Existing layout: `frontend/src/app/(app)/layout.tsx`
- User menu: `frontend/src/components/auth/user-menu.tsx`
- Auth types: `frontend/src/lib/auth/auth-types.ts`

## Overview

Create role-based dashboard layouts with sidebar navigation. Different views for Organizer (event management), Staff (check-in), and Admin (user management). Attendees see marketplace view.

## Key Insights

1. **Role-Based Navigation**: JWT contains `role` claim. Use it to show/hide menu items.

2. **Separate Dashboard Routes**: Use Next.js route groups:
   - `(dashboard)/organizer/*` - Event management
   - `(dashboard)/staff/*` - Check-in interface
   - `(dashboard)/admin/*` - User management
   - `(app)/settings/*` - Shared settings

3. **Existing App Layout**: Already has header + user menu. Extend with sidebar for dashboard.

4. **Mobile-First**: Sidebar collapses to hamburger menu on mobile.

## Requirements

### Functional Requirements
- Sidebar navigation with role-based links
- Mobile-responsive (collapsible sidebar)
- Active route highlighting
- Breadcrumbs for nested routes
- Logout functionality

### Non-Functional Requirements
- Follow shadcn/ui patterns
- Consistent spacing and colors
- Smooth transitions
- Accessible (ARIA labels)

## Architecture

```
(dashboard)/
├── layout.tsx          # Dashboard shell (sidebar + header)
├── organizer/
│   ├── layout.tsx      # Organizer-specific layout
│   └── page.tsx        # Dashboard home
├── staff/
│   ├── layout.tsx      # Staff-specific layout
│   └── page.tsx        # Check-in interface
└── admin/
    ├── layout.tsx      # Admin-specific layout
    └── page.tsx        # User management
```

## Related Code Files

### Files to Create
- `frontend/src/components/dashboard/sidebar.tsx` - Sidebar navigation
- `frontend/src/components/dashboard/sidebar-nav-item.tsx` - Nav item component
- `frontend/src/components/dashboard/dashboard-shell.tsx` - Layout wrapper
- `frontend/src/app/(dashboard)/layout.tsx` - Dashboard layout
- `frontend/src/app/(dashboard)/organizer/page.tsx` - Organizer dashboard
- `frontend/src/app/(dashboard)/staff/page.tsx` - Staff dashboard
- `frontend/src/app/(dashboard)/admin/page.tsx` - Admin dashboard

### Files to Modify
- `frontend/src/app/(app)/layout.tsx` - Keep for marketplace routes
- `frontend/src/components/auth/user-menu.tsx` - Already has logout

## Implementation Steps

1. **Create Sidebar Component**
   ```typescript
   // frontend/src/components/dashboard/sidebar.tsx
   "use client";

   import { cn } from "@/lib/utils";
   import { ChevronLeft, LayoutDashboard, TicketScan, Users, Settings, Calendar, CreditCard } from "lucide-react";
   import Link from "next/link";
   import { usePathname } from "next/navigation";
   import { useAuth } from "@/contexts/auth-context";
   import { Button } from "@/components/ui/button";
   { Skeleton } from "@/components/ui/skeleton";

   interface NavItem {
     title: string;
     href: string;
     icon: React.ComponentType<{ className?: string }>;
     roles: string[];
   }

   const navItems: NavItem[] = [
     {
       title: "Tổng quan",
       href: "/dashboard",
       icon: LayoutDashboard,
       roles: ["Organizer", "Staff", "Admin"],
     },
     {
       title: "Sự kiện",
       href: "/dashboard/events",
       icon: Calendar,
       roles: ["Organizer", "Admin"],
     },
     {
       title: "Check-in",
       href: "/dashboard/check-in",
       icon: TicketScan,
       roles: ["Staff", "Admin"],
     },
     {
       title: "Người dùng",
       href: "/dashboard/users",
       icon: Users,
       roles: ["Admin"],
     },
     {
       title: "Cài đặt",
       href: "/settings",
       icon: Settings,
       roles: ["Organizer", "Staff", "Admin", "Attendee"],
     },
   ];

   export function Sidebar() {
     const pathname = usePathname();
     const { user, isLoading } = useAuth();

     if (isLoading) {
       return <SidebarSkeleton />;
     }

     const userRole = user?.role ?? "Attendee";
     const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

     return (
       <div className="flex h-full w-64 flex-col border-r border-stone-200 bg-white">
         {/* Logo */}
         <div className="flex h-16 items-center border-b border-stone-200 px-6">
           <Link href="/" className="flex items-center gap-2">
             <div className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white">
               <Ticket className="size-4" />
             </div>
             <span className="text-lg font-semibold">TicketStar</span>
           </Link>
         </div>

         {/* Navigation */}
         <nav className="flex-1 space-y-1 p-4">
           {visibleItems.map((item) => {
             const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
             return (
               <Link
                 key={item.href}
                 href={item.href}
                 className={cn(
                   "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                   isActive
                     ? "bg-amber-50 text-amber-800"
                     : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                 )}
               >
                 <item.icon className="size-4" aria-hidden="true" />
                 {item.title}
               </Link>
             );
           })}
         </nav>

         {/* User info footer */}
         <div className="border-t border-stone-200 p-4">
           <div className="flex items-center gap-3 rounded-lg bg-stone-50 p-3">
             <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
               {user?.email.slice(0, 2).toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-stone-900 truncate">
                 {user?.email}
               </p>
               <p className="text-xs text-stone-500">
                 {userRole === "Organizer" ? "Ban tổ chức" :
                  userRole === "Staff" ? "Nhân viên" :
                  userRole === "Admin" ? "Quản trị" : "Khán giả"}
               </p>
             </div>
           </div>
         </div>
       </div>
     );
   }

   function SidebarSkeleton() {
     return (
       <div className="flex h-full w-64 flex-col border-r border-stone-200 bg-white p-4 space-y-4">
         <Skeleton className="h-8 w-32" />
         <Skeleton className="h-10 w-full" />
         <Skeleton className="h-10 w-full" />
         <Skeleton className="h-10 w-full" />
       </div>
     );
   }
   ```

2. **Create Dashboard Shell**
   ```typescript
   // frontend/src/components/dashboard/dashboard-shell.tsx
   "use client";

   import { Sidebar } from "./sidebar";
   { UserMenu } from "@/components/auth/user-menu";

   interface DashboardShellProps {
     children: React.ReactNode;
   }

   export function DashboardShell({ children }: DashboardShellProps) {
     return (
       <div className="flex h-screen overflow-hidden bg-[#faf8f5]">
         <Sidebar />
         <div className="flex flex-1 flex-col overflow-hidden">
           {/* Header */}
           <header className="flex h-16 items-center justify-between border-b border-stone-200/60 bg-white/80 px-6">
             <h1 className="text-lg font-semibold text-stone-900">
               Dashboard
             </h1>
             <UserMenu />
           </header>

           {/* Content */}
           <main className="flex-1 overflow-y-auto p-6">
             {children}
           </main>
         </div>
       </div>
     );
   }
   ```

3. **Create Dashboard Layout**
   ```typescript
   // frontend/src/app/(dashboard)/layout.tsx
   import { ProtectedRoute } from "@/components/auth/protected-route";
   import { DashboardShell } from "@/components/dashboard/dashboard-shell";

   export default function DashboardLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     return (
       <ProtectedRoute>
         <DashboardShell>{children}</DashboardShell>
       </ProtectedRoute>
     );
   }
   ```

4. **Create Role-Specific Pages**
   ```typescript
   // frontend/src/app/(dashboard)/organizer/page.tsx
   import { Calendar, Plus, TrendingUp } from "lucide-react";
   import { Button } from "@/components/ui/button";
   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

   export default function OrganizerDashboardPage() {
     return (
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-semibold text-stone-900">Tổng quan</h1>
             <p className="text-sm text-stone-500">Chào mừng trở lại!</p>
           </div>
           <Button className="bg-amber-800 hover:bg-amber-900">
             <Plus className="mr-2 size-4" />
             Tạo sự kiện
           </Button>
         </div>

         {/* Stats cards */}
         <div className="grid gap-4 md:grid-cols-3">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-stone-600">
                 Sự kiện đang chạy
               </CardTitle>
               <Calendar className="size-4 text-stone-400" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-semibold text-stone-900">3</div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-stone-600">
                 Vé đã bán
               </CardTitle>
               <TrendingUp className="size-4 text-stone-400" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-semibold text-stone-900">1,234</div>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium text-stone-600">
                Doanh thu
               </CardTitle>
               <CreditCard className="size-4 text-stone-400" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-semibold text-stone-900">
                 12.5M đ
               </div>
             </CardContent>
           </Card>
         </div>

         {/* Recent events list placeholder */}
         <Card>
           <CardHeader>
             <CardTitle>Sự kiện gần đây</CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-sm text-stone-500">Chưa có sự kiện nào.</p>
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

## Todo List

- [ ] Create `sidebar.tsx` component with role-based nav
- [ ] Create `dashboard-shell.tsx` layout wrapper
- [ ] Create `(dashboard)/layout.tsx`
- [ ] Create organizer dashboard page
- [ ] Create staff dashboard page
- [ ] Create admin dashboard page
- [ ] Test mobile responsiveness
- [ ] Verify active route highlighting

## Success Criteria

- [ ] Sidebar shows role-appropriate links
- [ ] Active route is highlighted
- [ ] Mobile sidebar collapses (hamburger menu)
- [ ] Breadcrumbs work for nested routes
- [ ] All roles see correct dashboard
- [ ] Navigation is smooth (no full page reload)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Role mismatch in JWT | Verify role claim matches backend enum |
| Sidebar overflow | Use flex-1 and overflow-y-auto |
| Mobile UX issues | Test on actual mobile device |

## Security Considerations

- Role-based UI is UX convenience, not security
- Real enforcement happens in backend (authorize attributes)
- Never rely on frontend for access control

## Next Steps

Once dashboard layout complete, proceed to **Phase 04: Role-Based Routing** to enforce access control.
