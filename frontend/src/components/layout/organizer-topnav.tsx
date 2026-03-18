"use client";

// Top navigation bar for the organizer dashboard layout.
// Contains only: "Tạo sự kiện" button (opens new tab) + user avatar dropdown.
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";

export function OrganizerTopNav() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b border-stone-200 bg-white/90 px-6 backdrop-blur-sm">
      <Button
        asChild
        size="sm"
        className="h-8 gap-1.5 bg-amber-500 px-3 text-xs font-semibold text-white shadow-sm hover:bg-amber-600"
      >
        <Link href="/organizer/events/new">
          <CalendarPlus className="size-3.5" />
          Tạo sự kiện
        </Link>
      </Button>

      <UserMenu />
    </header>
  );
}
