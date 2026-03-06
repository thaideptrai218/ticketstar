"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";

interface UseEventSearchReturn {
  events: EventListItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  search: string;
  isLoading: boolean;
  error: string | null;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
}

export function useEventSearch(): UseEventSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("q") ?? "";
  const initialPage = Number(searchParams.get("page") ?? "1");

  const [search, setSearchState] = useState(initialSearch);
  const [page, setPageState] = useState(initialPage);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync URL params
  const updateUrl = useCallback(
    (q: string, p: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (p > 1) params.set("page", String(p));
      const qs = params.toString();
      router.replace(`/events${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      setPageState(1);
      updateUrl(value, 1);
    },
    [updateUrl],
  );

  const setPage = useCallback(
    (p: number) => {
      setPageState(p);
      updateUrl(search, p);
    },
    [search, updateUrl],
  );

  // Fetch events with debounce on search changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "12");
      // Note: backend ListEvents doesn't have search param yet — pass it anyway for future use
      if (search) params.set("search", search);

      apiFetch<PagedResult<EventListItem>>(`/api/events?${params}`)
        .then((data) => {
          if (cancelled) return;
          setEvents(data.items);
          setTotalCount(data.totalCount);
          setTotalPages(data.totalPages);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Loi tai du lieu");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, search]);

  return { events, totalCount, totalPages, page, search, isLoading, error, setSearch, setPage };
}
