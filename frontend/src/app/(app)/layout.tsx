import Link from "next/link";
import { Ticket } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { UserMenu } from "@/components/auth/user-menu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#faf8f5]">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/home" className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white">
                <Ticket className="size-4" aria-hidden="true" />
              </div>
              <span
                className="text-lg font-semibold tracking-tight text-stone-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                TicketStar
              </span>
            </Link>

            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
