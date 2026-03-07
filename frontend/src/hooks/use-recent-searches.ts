"use client";

// Recent searches hook — persists up to 5 entries in localStorage
// Deduplicates on add; most recent first
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ts_recent_searches";
const MAX_ENTRIES = 5;

function loadFromStorage(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistToStorage(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    setRecentSearches(loadFromStorage());
  }, []);

  const addSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const deduped = [q, ...prev.filter((r) => r !== q)].slice(0, MAX_ENTRIES);
      persistToStorage(deduped);
      return deduped;
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((r) => r !== query);
      persistToStorage(updated);
      return updated;
    });
  }, []);

  return { recentSearches, addSearch, removeSearch };
}
