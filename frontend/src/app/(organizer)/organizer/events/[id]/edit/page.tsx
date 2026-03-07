"use client";

// Edit event page — fetches existing event, renders prefilled form
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { EventForm, type EventFormData } from "@/components/organizer/event-form";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventDetail } from "@/types/events";

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<EventDetail>(`/api/events/${id}`).then(setEvent).finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmit(data: EventFormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/events/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          venue: data.venue || null,
          imageUrl: data.imageUrl || null,
          startAt: new Date(data.startAt).toISOString(),
          endAt: new Date(data.endAt).toISOString(),
        }),
      });
      router.push("/organizer/events");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật sự kiện.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!event) return <p className="text-red-500">Không tìm thấy sự kiện.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Chỉnh sửa: {event.title}</h1>
      {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <EventForm
        defaultValues={{
          title: event.title,
          slug: event.slug,
          description: event.description ?? "",
          venue: event.venue ?? "",
          imageUrl: event.imageUrl ?? "",
          startAt: toLocalDatetime(event.startAt),
          endAt: toLocalDatetime(event.endAt),
        }}
        onSubmit={handleSubmit}
        submitLabel="Lưu thay đổi"
        isSubmitting={isSubmitting}
        hideSlug
      />
    </div>
  );
}
