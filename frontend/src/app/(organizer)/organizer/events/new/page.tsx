"use client";

// Create new event page — uses 4-step wizard
import { EventWizard } from "@/components/organizer/event-wizard/event-wizard";

export default function CreateEventPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900">Tạo sự kiện mới</h1>
      <EventWizard mode="create" />
    </div>
  );
}
