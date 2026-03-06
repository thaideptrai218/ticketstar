import { NavigationBar } from "@/components/landing/navigation-bar";

// Public layout — shared navbar + footer for marketplace pages (/events, /events/[slug])
// Landing page (/) uses its own full-page layout, so it's NOT inside this route group.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f5]">
      {/* Navbar */}
      <NavigationBar />

      {/* Content — offset for fixed navbar, grows to push footer down */}
      <main className="flex-1 pt-16">{children}</main>

      {/* Footer — always at bottom */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-6 text-center text-sm text-stone-400">
          &copy; {new Date().getFullYear()} TicketStar. Bảo lưu mọi quyền.
        </div>
      </footer>
    </div>
  );
}
