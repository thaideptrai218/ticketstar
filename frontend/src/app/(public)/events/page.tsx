"use client";

// Events listing page — search + full filter bar (migrated from home) + paginated grid
// Filter state synced to URL: ?q=, ?filter=, ?location=, ?category=, ?priceRange=
import { Suspense } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EventGrid } from "@/components/events/event-grid";
import { HomeFilterBar } from "@/components/discover/home-filter-bar";
import { useEventSearch } from "@/hooks/use-event-search";

function SkeletonGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-stone-200 overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EventListingContent() {
  const {
    events, totalPages, page, search, homeFilters,
    isLoading, error, setSearch, setPage, setHomeFilters,
  } = useEventSearch();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold tracking-tight text-stone-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sự kiện
        </h1>
        <p className="mt-2 text-stone-500">Tìm kiếm và đặt vé sự kiện yêu thích</p>
      </div>

      {/* Search input */}
      <div className="mb-2">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm sự kiện..."
            className="h-11 rounded-xl border-stone-200 bg-stone-50/80 pl-10 focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-8 p-0 text-stone-400 hover:text-stone-600"
              onClick={() => setSearch("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar — migrated from home page */}
      <HomeFilterBar filters={homeFilters} onFiltersChange={setHomeFilters} />

      {/* Content */}
      {isLoading ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="py-16 text-center text-red-500">{error}</div>
      ) : (
        <>
          <EventGrid events={events} emptyMessage="Không tìm thấy sự kiện phù hợp." />

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="border-stone-200"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-3 text-sm text-stone-600">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="border-stone-200"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense>
      <EventListingContent />
    </Suspense>
  );
}
