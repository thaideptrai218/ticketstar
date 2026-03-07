"use client";

import { LayoutDashboard, Users } from "lucide-react";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";
import { ProtectedRoute } from "@/components/auth/protected-route";

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Người dùng", href: "/admin/users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-[#faf8f5]">
        <AppSidebar navItems={NAV_ITEMS} title="Quản trị viên" />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
