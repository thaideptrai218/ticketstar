"use client";

// Create new event page
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventForm, type EventFormData } from "@/components/organizer/event-form";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: EventFormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          slug: data.slug,
          description: data.description || null,
          venue: data.venue || null,
          imageUrl: data.imageUrl || null,
          startAt: new Date(data.startAt).toISOString(),
          endAt: new Date(data.endAt).toISOString(),
          ticketTypes: [],
        }),
      });
      router.push("/organizer/events");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo sự kiện.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Tạo sự kiện mới</h1>
      {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <EventForm onSubmit={handleSubmit} submitLabel="Tạo sự kiện" isSubmitting={isSubmitting} />
    </div>
  );
}
