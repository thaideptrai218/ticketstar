import Link from "next/link";
import { Ticket } from "lucide-react";

// Public layout — shared navbar + footer for marketplace pages (/events, /events/[slug])
// Landing page (/) uses its own full-page layout, so it's NOT inside this route group.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-700 text-white shadow-sm">
              <Ticket className="size-4" strokeWidth={2.5} />
            </div>
            <span
              className="text-base font-semibold tracking-tight text-stone-900 hidden sm:block"
              style={{ fontFamily: "var(--font-display)" }}
            >
              TicketStar
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/events" className="text-stone-600 hover:text-stone-900 transition-colors">
              Su kien
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-stone-900 px-4 py-2 text-white hover:bg-stone-800 transition-colors"
            >
              Dang nhap
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8 mt-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6 text-center text-sm text-stone-400">
          &copy; {new Date().getFullYear()} TicketStar. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
