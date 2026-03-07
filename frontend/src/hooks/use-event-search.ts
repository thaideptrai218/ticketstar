"use client";

// Event search hook — syncs search, page, and HomeFilters to URL params
// Fetches /api/events with all active filters; price filter is client-side only
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";
import type { HomeFilters } from "@/components/discover/home-filter-bar";
import type { TimePreset } from "@/components/discover/date-range-picker";

// Map URL filter param → time preset
const FILTER_TO_PRESET: Record<string, TimePreset> = {
  "": "all",
  featured: "all",
  today: "today",
  tomorrow: "tomorrow",
  "this-week": "this-week",
  "this-month": "this-month",
  custom: "custom",
};

// Map time preset → API filter param
const PRESET_TO_FILTER: Record<TimePreset, string> = {
  all: "featured",
  today: "today",
  tomorrow: "tomorrow",
  "this-week": "this-week",
  "this-month": "this-month",
  custom: "custom",
};

// Price filter applied client-side (no backend range support yet)
function applyPriceFilter(events: EventListItem[], priceRange?: HomeFilters["priceRange"]): EventListItem[] {
  if (!priceRange) return events;
  return events.filter((e) => {
    switch (priceRange) {
      case "free": return e.minPrice === 0;
      case "under-100k": return e.minPrice < 100_000;
      case "100k-500k": return e.minPrice >= 100_000 && e.minPrice <= 500_000;
      case "over-500k": return e.minPrice > 500_000;
      default: return true;
    }
  });
}

interface UseEventSearchReturn {
  events: EventListItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  search: string;
  homeFilters: HomeFilters;
  isLoading: boolean;
  error: string | null;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
  setHomeFilters: (filters: HomeFilters) => void;
}

export function useEventSearch(): UseEventSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial state from URL
  const [search, setSearchState] = useState(searchParams.get("q") ?? "");
  const [page, setPageState] = useState(Number(searchParams.get("page") ?? "1"));
  const [filterParam, setFilterParam] = useState(searchParams.get("filter") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [priceRange, setPriceRange] = useState<HomeFilters["priceRange"]>(
    (searchParams.get("priceRange") as HomeFilters["priceRange"]) ?? undefined,
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const v = searchParams.get("dateFrom");
    return v ? new Date(v) : undefined;
  });
  const [dateTo, setDateTo] = useState<Date | undefined>(() => {
    const v = searchParams.get("dateTo");
    return v ? new Date(v) : undefined;
  });

  const [rawEvents, setRawEvents] = useState<EventListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build HomeFilters from URL state for consumption by HomeFilterBar
  const homeFilters = useMemo<HomeFilters>(() => {
    const preset = FILTER_TO_PRESET[filterParam] ?? "all";
    return {
      dateRange: preset === "custom" ? { preset: "custom", from: dateFrom, to: dateTo } : { preset },
      location: location || undefined,
      eventType: category || undefined,
      priceRange,
    };
  }, [filterParam, location, category, priceRange, dateFrom, dateTo]);

  // Build and sync URL from all filter state
  const updateUrl = useCallback(
    (q: string, p: number, fp: string, loc: string, cat: string, pr: string, df?: Date, dt?: Date) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (p > 1) params.set("page", String(p));
      if (fp && fp !== "featured") params.set("filter", fp);
      if (loc) params.set("location", loc);
      if (cat) params.set("category", cat);
      if (pr) params.set("priceRange", pr);
      if (df) params.set("dateFrom", df.toISOString());
      if (dt) params.set("dateTo", dt.toISOString());
      const qs = params.toString();
      router.replace(`/events${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      setPageState(1);
      updateUrl(value, 1, filterParam, location, category, priceRange ?? "", dateFrom, dateTo);
    },
    [updateUrl, filterParam, location, category, priceRange, dateFrom, dateTo],
  );

  const setPage = useCallback(
    (p: number) => {
      setPageState(p);
      updateUrl(search, p, filterParam, location, category, priceRange ?? "", dateFrom, dateTo);
    },
    [search, updateUrl, filterParam, location, category, priceRange, dateFrom, dateTo],
  );

  const setHomeFilters = useCallback(
    (f: HomeFilters) => {
      const fp = PRESET_TO_FILTER[f.dateRange.preset];
      const loc = f.location ?? "";
      const cat = f.eventType ?? "";
      const pr = f.priceRange ?? "";
      const df = f.dateRange.preset === "custom" ? f.dateRange.from : undefined;
      const dt = f.dateRange.preset === "custom" ? f.dateRange.to : undefined;
      setFilterParam(fp);
      setLocation(loc);
      setCategory(cat);
      setPriceRange(f.priceRange);
      setDateFrom(df);
      setDateTo(dt);
      setPageState(1);
      updateUrl(search, 1, fp, loc, cat, pr, df, dt);
    },
    [search, updateUrl],
  );

  // Fetch events (debounced on search changes)
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const preset = FILTER_TO_PRESET[filterParam] ?? "all";
    const apiFilter = PRESET_TO_FILTER[preset];

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "12");
      params.set("filter", apiFilter);
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      if (category) params.set("category", category);
      if (preset === "custom" && dateFrom) {
        params.set("dateFrom", dateFrom.toISOString());
        params.set("dateTo", (dateTo ?? dateFrom).toISOString());
      }

      apiFetch<PagedResult<EventListItem>>(`/api/events?${params}`)
        .then((data) => {
          if (cancelled) return;
          setRawEvents(data.items);
          setTotalCount(data.totalCount);
          setTotalPages(data.totalPages);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, search, filterParam, location, category, dateFrom, dateTo]);

  // Apply price filter client-side
  const events = useMemo(() => applyPriceFilter(rawEvents, priceRange), [rawEvents, priceRange]);

  return { events, totalCount, totalPages, page, search, homeFilters, isLoading, error, setSearch, setPage, setHomeFilters };
}
