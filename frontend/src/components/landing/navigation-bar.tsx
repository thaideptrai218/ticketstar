"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";

const navLinks = [
  { label: "Tính năng", href: "#features" },
  { label: "Cách hoạt động", href: "#how-it-works" },
];

export function NavigationBar() {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white">
            <Ticket className="size-4" />
          </div>
          <span
            className="text-lg font-semibold tracking-tight text-stone-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TicketStar
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-stone-900 text-white"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-900",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Fixed-width right section prevents layout shift */}
        <div className="flex w-[140px] items-center justify-end gap-3">
          {isLoading ? (
            <div className="size-8 animate-pulse rounded-full bg-stone-100" />
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-stone-600 hover:text-stone-900"
                asChild
              >
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button
                size="sm"
                className="bg-amber-700 text-white hover:bg-amber-800"
                asChild
              >
                <Link href="/register">Bắt đầu</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
