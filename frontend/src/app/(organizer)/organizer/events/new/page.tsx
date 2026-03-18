"use client";

// Create new event page — uses 4-step wizard.
// Guards: if user has no organizer profile, show prompt to create one first.
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { EventWizard } from "@/components/organizer/event-wizard/event-wizard";
import { Button } from "@/components/ui/button";

export default function CreateEventPage() {
  const { user } = useAuth();

  // Not an organizer yet — prompt to create/join an organization first
  if (user && !user.isOrganizer) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-6">
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-amber-100 mx-auto">
          <Building2 className="size-8 text-amber-700" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Bạn chưa thuộc tổ chức nào</h2>
          <p className="mt-2 text-stone-500 text-sm">
            Để tạo sự kiện, bạn cần có hồ sơ Ban tổ chức. Tạo tổ chức của bạn ngay để bắt đầu.
          </p>
        </div>
        <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <Link href="/become-organizer">
            Tạo hồ sơ Ban tổ chức
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900">Tạo sự kiện mới</h1>
      <EventWizard mode="create" />
    </div>
  );
}
