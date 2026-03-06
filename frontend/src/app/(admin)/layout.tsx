import { CreditCard, LayoutDashboard, List, Settings, Users } from "lucide-react";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { label: "Người dùng", href: "/admin/users", icon: Users },
  { label: "Sự kiện", href: "/admin/events", icon: List },
  { label: "Thanh toán", href: "/admin/payments", icon: CreditCard },
  { label: "Cài đặt", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <AppSidebar navItems={NAV_ITEMS} title="Quản trị viên" />
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
