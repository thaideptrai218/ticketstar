"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon, Menu, X, Star } from "lucide-react";
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

// ─── TicketStar logo mark ──────────────────────────────────────────────────────

function LogoMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500 shadow-sm group-hover:bg-amber-600 transition-colors">
        <Star className="size-4 fill-white text-white" strokeWidth={0} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight text-stone-900">TicketStar</span>
        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">Organizer</span>
      </div>
    </Link>
  );
}

// ─── Nav list ─────────────────────────────────────────────────────────────────

function SidebarNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {navItems.map(({ label, href, icon: Icon }) => {
        // Exact match OR sub-path, but only if no sibling nav item is a more specific match
        const isActive = pathname === href ||
          (pathname.startsWith(`${href}/`) && !navItems.some((n) => n.href !== href && pathname.startsWith(n.href)));
        return (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
              ${isActive
                ? "bg-amber-50 text-amber-800 shadow-[inset_2px_0_0_0] shadow-amber-500"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              }`}
          >
            <Icon
              className={`size-4 shrink-0 transition-colors ${isActive ? "text-amber-600" : "text-stone-400 group-hover:text-stone-700"}`}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

function SidebarContent({ navItems, title }: AppSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo header */}
      <div className="flex h-16 shrink-0 items-center border-b border-stone-100 px-5">
        <LogoMark />
      </div>

      {/* Optional section label */}
      {title && (
        <div className="px-6 pt-4 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{title}</span>
        </div>
      )}

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-1">
        <SidebarNav navItems={navItems} />
      </div>

      {/* Bottom branding */}
      <div className="border-t border-stone-100 px-5 py-3">
        <p className="text-[10px] text-stone-300 text-center">© 2026 TicketStar</p>
      </div>
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function AppSidebar({ navItems, title }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-stone-200 bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.04)]">
        <SidebarContent navItems={navItems} title={title} />
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
          <SheetContent side="left" className="w-60 p-0">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Đóng menu</span>
              </button>
            </div>
            <div onClick={() => setMobileOpen(false)} className="h-full">
              <SidebarContent navItems={navItems} title={title} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
