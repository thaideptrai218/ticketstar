"use client";

// Top navigation bar for the admin dashboard layout.
// Contains: page title (dynamic) + user avatar dropdown.
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Tổng quan",
  "/admin/users": "Quản lý người dùng",
};

export function AdminTopNav() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Quản trị viên";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white/90 px-6 backdrop-blur-sm">
      <h1 className="text-sm font-semibold text-stone-700">{title}</h1>
      <UserMenu />
    </header>
  );
}
