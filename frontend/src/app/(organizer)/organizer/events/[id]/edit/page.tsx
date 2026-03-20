"use client";

// Edit event page — fetches existing event data, renders wizard pre-populated
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <div>
        <Link
          href={`/organizer/events/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          Quay lại chi tiết sự kiện
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">Chỉnh sửa: {event.title}</h1>
      </div>
      <EventWizard mode="edit" initialData={event} />
    </div>
  );
}
