"use client";

import Link from "next/link";
import { Ticket, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";
import { useState } from "react";

export function NavigationBar() {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    console.log("Search:", searchQuery);
    // TODO: Navigate to search results
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-white backdrop-blur-md border-b border-stone-200/80">
      <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-6 lg:gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-700 text-white shadow-sm">
            <Ticket className="size-4.5" strokeWidth={2.5} />
          </div>
          <span
            className="text-base font-semibold tracking-tight text-stone-900 hidden sm:block"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TicketStar
          </span>
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:flex">
          <div className="flex w-full items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2.5 shadow-sm transition-all duration-200 focus-within:border-amber-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-100">
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

        {/* Spacer for mobile balance */}
        <div className="flex-1 hidden md:block" />

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* "Tạo sự kiện" - Primary CTA button */}
          <div className="hidden items-center gap-2 lg:flex">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm font-medium border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200 gap-2"
              asChild
            >
              <Link href="/events/create">
                <Plus className="size-4" strokeWidth={2.5} />
                <span>Tạo sự kiện</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              asChild
            >
              <Link href="/tickets">Vé của tôi</Link>
            </Button>
          </div>

          {/* Auth Buttons */}
          {isLoading ? (
            <div className="size-9 animate-pulse rounded-full bg-stone-100" />
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                asChild
              >
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button
                size="sm"
                className="h-9 bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 shadow-sm hover:shadow transition-all duration-200"
                asChild
              >
                <Link href="/register">Bắt đầu</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
