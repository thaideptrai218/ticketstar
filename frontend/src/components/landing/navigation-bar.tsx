"use client";

// Global navbar — fixed with shrink-on-scroll, balanced layout
// Search + nav links + user actions (notifications, avatar dropdown)
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Plus, Search, ShoppingBag, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";

export function NavigationBar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  // Shrink navbar on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/events");
    }
  };

  const isOrganizer = user?.role === "Admin" || user?.role === "Organizer";

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 bg-white/95 backdrop-blur-md border-b transition-all duration-300 ${
        scrolled ? "border-stone-200 shadow-sm" : "border-transparent"
      }`}
    >
      <nav
        className={`mx-auto flex max-w-7xl items-center gap-3 px-4 md:px-6 lg:gap-5 transition-all duration-300 ${
          scrolled ? "py-2" : "py-3"
        }`}
      >
        {/* Logo — shrinks on scroll */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center justify-center rounded-lg bg-amber-700 text-white shadow-sm transition-all duration-300 ${
              scrolled ? "size-8" : "size-9"
            }`}
          >
            <Ticket className="size-4" strokeWidth={2.5} />
          </div>
          <span
            className="text-base font-semibold tracking-tight text-stone-900 hidden sm:block"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TicketStar
          </span>
        </Link>

        {/* Search bar — desktop */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex">
          <div
            className={`flex w-full items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 shadow-sm transition-all duration-200 focus-within:border-amber-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-100 ${
              scrolled ? "py-1.5" : "py-2"
            }`}
          >
            <Search className="size-4 text-stone-400 shrink-0" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sự kiện, nghệ sĩ, địa điểm..."
              className="flex-1 border-none bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
          </div>
        </form>

        {/* Spacer — fills remaining space to push right section to the edge */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-1.5 lg:gap-2">
          {/* Nav links — desktop only, auth-gated */}
          {isAuthenticated && (
            <div className="hidden items-center gap-1 lg:flex">
              {isOrganizer && (
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 gap-1.5" asChild>
                  <Link href="/events/create">
                    <Plus className="size-3.5" strokeWidth={2.5} />
                    Tạo sự kiện
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 gap-1.5" asChild>
                <Link href="/attendee/my-tickets">
                  <Ticket className="size-3.5" />
                  Vé của tôi
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 gap-1.5" asChild>
                <Link href="/attendee/orders">
                  <ShoppingBag className="size-3.5" />
                  Đơn hàng
                </Link>
              </Button>
            </div>
          )}

          {/* Notification bell — auth-gated */}
          {isAuthenticated && (
            <button className="relative size-8 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
              <Bell className="size-4" />
            </button>
          )}

          {/* Auth: avatar or login/register */}
          {isLoading ? (
            <div className="size-8 animate-pulse rounded-full bg-stone-100" />
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-stone-600 hover:text-stone-900" asChild>
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button size="sm" className="h-8 bg-stone-900 px-3.5 text-xs font-medium text-white hover:bg-stone-800 shadow-sm" asChild>
                <Link href="/register">Bắt đầu</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
