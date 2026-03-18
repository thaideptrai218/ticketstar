"use client";

// Edit event page — fetches existing event data, renders wizard pre-populated
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { EventWizard } from "@/components/organizer/event-wizard/event-wizard";
import { apiFetch } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventDetail } from "@/types/events";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<EventDetail>(`/api/events/${id}`)
      .then(setEvent)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!event) return <p className="text-red-500">Không tìm thấy sự kiện.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Chỉnh sửa: {event.title}</h1>
      <EventWizard mode="edit" initialData={event} />
    </div>
  );
}
