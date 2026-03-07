"use client";

// Sự kiện đặc biệt — upcoming events ordered by popularity
// Fetches GET /api/events?filter=featured&pageSize=8
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { EventCard } from "@/components/events/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-9 w-full mt-2" />
      </div>
    </div>
  );
}

export function FeaturedEvents() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<PagedResult<EventListItem>>("/api/events?filter=featured&pageSize=8")
      .then((data) => setEvents(data.items))
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100">
            <Star className="size-4 text-amber-700" strokeWidth={2} />
          </div>
          <h2 className="text-lg font-semibold text-stone-900">Sự kiện đặc biệt</h2>
        </div>
        <Link
          href="/events?filter=featured"
          className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          Xem tất cả <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">Chưa có sự kiện đặc biệt nào.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {events.slice(0, 4).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
