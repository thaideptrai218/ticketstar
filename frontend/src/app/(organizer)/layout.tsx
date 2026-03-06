import { BarChart3, CalendarPlus, LayoutDashboard, List, Settings } from "lucide-react";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/organizer", icon: LayoutDashboard },
  { label: "Sự kiện của tôi", href: "/organizer/events", icon: List },
  { label: "Tạo sự kiện", href: "/organizer/events/new", icon: CalendarPlus },
  { label: "Thống kê", href: "/organizer/analytics", icon: BarChart3 },
  { label: "Cài đặt", href: "/organizer/settings", icon: Settings },
];

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <AppSidebar navItems={NAV_ITEMS} title="Ban tổ chức" />
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
