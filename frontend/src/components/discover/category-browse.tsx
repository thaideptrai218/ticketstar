"use client";

// Category browse section — pill tabs for each category + event grid for active tab
// Links "Xem tất cả" to /events?category=<active> for deep linking
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { EventCard } from "@/components/events/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";

const CATEGORIES = ["Âm nhạc", "Thể thao", "Nghệ thuật", "Công nghệ", "Ẩm thực", "Giáo dục"];

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

export function CategoryBrowse() {
  const [active, setActive] = useState(CATEGORIES[0]);
  const [cache, setCache] = useState<Partial<Record<string, EventListItem[]>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cache[active]) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    apiFetch<PagedResult<EventListItem>>(
      `/api/events?category=${encodeURIComponent(active)}&filter=featured&pageSize=4`,
    )
      .then((data) => setCache((prev) => ({ ...prev, [active]: data.items })))
      .catch(() => setCache((prev) => ({ ...prev, [active]: [] })))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const events = cache[active] ?? [];

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-violet-100">
            <LayoutGrid className="size-4 text-violet-600" strokeWidth={2} />
          </div>
          <h2 className="text-lg font-semibold text-stone-900">Theo thể loại</h2>
        </div>
        <Link
          href={`/events?category=${encodeURIComponent(active)}`}
          className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          Xem tất cả <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Category pill tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              active === cat
                ? "border-violet-400 bg-violet-50 text-violet-700"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Event grid */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">
          Chưa có sự kiện nào trong thể loại &quot;{active}&quot;.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
