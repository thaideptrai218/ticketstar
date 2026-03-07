"use client";

// Staff check-in event selection — lists events the staff member is assigned to
import { useState, useEffect } from "react";
import Link from "next/link";
import { QrCode, MapPin, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/format-utils";
import type { StaffEvent } from "@/types/organizer";

export default function StaffCheckinSelectPage() {
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<StaffEvent[]>("/api/staff/my-events")
      .then(setEvents)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Chọn sự kiện check-in</h1>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="size-14 rounded-full bg-stone-100 flex items-center justify-center">
            <QrCode className="size-6 text-stone-400" />
          </div>
          <p className="text-stone-500">Bạn chưa được phân công sự kiện nào.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <Link key={event.eventId} href={`/checkin/${event.eventId}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 shrink-0">
                    <QrCode className="size-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-stone-900 truncate">{event.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
                      <span className="flex items-center gap-1"><CalendarDays className="size-3" />{formatDate(event.startAt)} {formatTime(event.startAt)}</span>
                      {event.venue && <span className="flex items-center gap-1"><MapPin className="size-3" />{event.venue}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
