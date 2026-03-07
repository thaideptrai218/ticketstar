"use client";

// Filtered events grid for the home/discover page
// Time filter maps to backend filter param; price/location/type applied client-side
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { EventCard } from "@/components/events/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";
import type { HomeFilters } from "./home-filter-bar";
import type { TimePreset } from "./date-range-picker";

// Maps time preset to backend filter param
const PRESET_TO_API_FILTER: Record<TimePreset, string> = {
  all: "featured",
  today: "today",
  tomorrow: "tomorrow",
  "this-week": "this-week",
  "this-month": "this-month",
  custom: "custom",
};

// Price filter applied client-side (no backend range param yet)
function applyClientFilters(events: EventListItem[], filters: HomeFilters): EventListItem[] {
  if (!filters.priceRange) return events;
  return events.filter((e) => {
    switch (filters.priceRange) {
      case "free": return e.minPrice === 0;
      case "under-100k": return e.minPrice < 100_000;
      case "100k-500k": return e.minPrice >= 100_000 && e.minPrice <= 500_000;
      case "over-500k": return e.minPrice > 500_000;
      default: return true;
    }
  });
}

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

interface Props {
  filters: HomeFilters;
}

export function HomeEventsGrid({ filters }: Props) {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use preset directly as dep so every preset change (including today/tomorrow) triggers a refetch
  const { preset } = filters.dateRange;

  useEffect(() => {
    setIsLoading(true);
    const apiFilter = PRESET_TO_API_FILTER[preset];
    const params = new URLSearchParams({ filter: apiFilter, pageSize: "12" });
    if (filters.location) params.set("location", filters.location);
    if (filters.eventType) params.set("category", filters.eventType);
    // Pass date range for custom preset; single-date pick uses from as both bounds
    if (preset === "custom" && filters.dateRange.from) {
      params.set("dateFrom", filters.dateRange.from.toISOString());
      params.set("dateTo", (filters.dateRange.to ?? filters.dateRange.from).toISOString());
    }
    apiFetch<PagedResult<EventListItem>>(`/api/events?${params}`)
      .then((data) => setEvents(data.items))
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, filters.location, filters.eventType, filters.dateRange.from, filters.dateRange.to]);

  const filtered = applyClientFilters(events, filters);

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-stone-400 text-sm">Không tìm thấy sự kiện nào phù hợp với bộ lọc.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
