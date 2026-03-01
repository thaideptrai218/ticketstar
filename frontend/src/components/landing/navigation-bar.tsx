import Link from "next/link";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Tính năng", href: "#features" },
  { label: "Cách hoạt động", href: "#how-it-works" },
];

export function NavigationBar() {
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

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-stone-600 hover:text-stone-900"
          >
            Đăng nhập
          </Button>
          <Button
            size="sm"
            className="bg-amber-700 text-white hover:bg-amber-800"
          >
            Bắt đầu
          </Button>
        </div>
      </nav>
    </header>
  );
}
