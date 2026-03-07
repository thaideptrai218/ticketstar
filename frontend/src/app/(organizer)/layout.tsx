"use client";

import { CalendarPlus, LayoutDashboard, List, Wallet } from "lucide-react";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";
import { OrganizerRoute } from "@/components/auth/organizer-route";

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/organizer/dashboard", icon: LayoutDashboard },
  { label: "Sự kiện của tôi", href: "/organizer/events", icon: List },
  { label: "Tạo sự kiện", href: "/organizer/events/new", icon: CalendarPlus },
  { label: "Thanh toán", href: "/organizer/payout", icon: Wallet },
];

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrganizerRoute>
      <div className="flex min-h-screen bg-[#faf8f5]">
        <AppSidebar navItems={NAV_ITEMS} title="Ban tổ chức" />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </OrganizerRoute>
  );
}
