"use client";

// Top navigation bar for the staff dashboard layout.
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";

const PAGE_TITLES: Record<string, string> = {
  "/staff/dashboard": "Tổng quan",
  "/staff/checkin": "Check-in",
  "/staff/posts": "Bài đăng",
};

export function StaffTopNav() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Nhân viên";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white/90 px-6 backdrop-blur-sm">
      <h1 className="text-sm font-semibold text-stone-700">{title}</h1>
      <UserMenu />
    </header>
  );
}
