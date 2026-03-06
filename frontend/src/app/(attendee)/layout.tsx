// Attendee layout — global navbar + clean content area, no tab nav
import { NavigationBar } from "@/components/landing/navigation-bar";

export default function AttendeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f5]">
      <NavigationBar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 pt-20 pb-8">
        {children}
      </main>

      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-6 text-center text-sm text-stone-400">
          &copy; {new Date().getFullYear()} TicketStar. Bảo lưu mọi quyền.
        </div>
      </footer>
    </div>
  );
}
