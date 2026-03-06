"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon, Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  navItems: NavItem[];
  title?: string;
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function SidebarNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
              ${isActive
                ? "bg-amber-50 text-amber-800"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function AppSidebar({ navItems, title }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-stone-200 bg-white">
        {title && (
          <div className="flex h-16 items-center border-b border-stone-200 px-5">
            <span className="text-sm font-semibold text-stone-900">{title}</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav navItems={navItems} />
        </div>
      </aside>

      {/* Mobile trigger + sheet */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="size-9 rounded-lg border-stone-200 bg-white shadow-sm">
              <Menu className="size-4" aria-hidden="true" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center justify-between border-b border-stone-200 px-5">
              {title && <span className="text-sm font-semibold text-stone-900">{title}</span>}
              <button
                onClick={() => setMobileOpen(false)}
                className="ml-auto text-stone-400 hover:text-stone-600"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Đóng menu</span>
              </button>
            </div>
            <div onClick={() => setMobileOpen(false)}>
              <SidebarNav navItems={navItems} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
