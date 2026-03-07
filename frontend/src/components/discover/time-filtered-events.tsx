"use client";

// Time-filtered events section — "Tuần này" / "Tháng này" toggle
// Fetches GET /api/events?filter=this-week or this-month on tab switch
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { EventCard } from "@/components/events/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";

type TimeFilter = "this-week" | "this-month";

const TABS: { value: TimeFilter; label: string }[] = [
  { value: "this-week", label: "Tuần này" },
  { value: "this-month", label: "Tháng này" },
];

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

export function TimeFilteredEvents() {
  const [activeTab, setActiveTab] = useState<TimeFilter>("this-week");
  const [cache, setCache] = useState<Partial<Record<TimeFilter, EventListItem[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch whenever the active tab changes, use in-memory cache to avoid re-fetch
  useEffect(() => {
    if (cache[activeTab]) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    apiFetch<PagedResult<EventListItem>>(`/api/events?filter=${activeTab}&pageSize=6`)
      .then((data) => setCache((prev) => ({ ...prev, [activeTab]: data.items })))
      .catch(() => setCache((prev) => ({ ...prev, [activeTab]: [] })))
      .finally(() => setIsLoading(false));
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const events = cache[activeTab] ?? [];

  return (
    <section>
      {/* Section header with inline tab toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-sky-100">
            <CalendarDays className="size-4 text-sky-600" strokeWidth={2} />
          </div>
          <h2 className="text-lg font-semibold text-stone-900">Sự kiện sắp tới</h2>

          {/* Tab pills */}
          <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab.value
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <Link
          href={`/events?filter=${activeTab}`}
          className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          Xem tất cả <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">
          Không có sự kiện nào trong {activeTab === "this-week" ? "tuần này" : "tháng này"}.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
