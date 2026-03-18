"use client";

import { QrCode, FileText, LayoutDashboard } from "lucide-react";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";
import { StaffTopNav } from "@/components/layout/staff-topnav";
import { StaffRoute } from "@/components/auth/staff-route";

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "Check-in", href: "/staff/checkin", icon: QrCode },
  { label: "Bài đăng", href: "/staff/posts", icon: FileText },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffRoute>
      <div className="flex min-h-screen bg-[#faf8f5]">
        <AppSidebar navItems={NAV_ITEMS} title="Nhân viên" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <StaffTopNav />
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </StaffRoute>
  );
}
