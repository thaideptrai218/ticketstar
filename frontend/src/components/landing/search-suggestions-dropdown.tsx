"use client";

// Search suggestions dropdown — grouped sections: recent searches, events, categories, locations
// Event cards show thumbnail + title + date + venue; categories/locations as pill chips
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, LayoutGrid, MapPin, ArrowRight, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/format-utils";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";

const CATEGORIES = ["Âm nhạc", "Thể thao", "Nghệ thuật", "Công nghệ", "Ẩm thực", "Giáo dục"];
const CITIES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hội An", "Nha Trang", "Cần Thơ"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

interface Props {
  query: string;
  recentSearches: string[];
  onSelect: (query: string) => void;
  onRemoveRecent: (query: string) => void;
}

export function SearchSuggestionsDropdown({ query, recentSearches, onSelect, onRemoveRecent }: Props) {
  const [events, setEvents] = useState<EventListItem[]>([]);

  // Debounced event fetch on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      apiFetch<PagedResult<EventListItem>>(`/api/events?search=${encodeURIComponent(query)}&pageSize=3`)
        .then((data) => setEvents(data.items))
        .catch(() => setEvents([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Client-side filter for categories and cities
  const lq = query.toLowerCase();
  const matchedCategories = CATEGORIES.filter((c) => c.toLowerCase().includes(lq)).slice(0, 2);
  const matchedCities = CITIES.filter((c) => c.toLowerCase().includes(lq)).slice(0, 2);
  const matchedRecent = recentSearches.filter((r) => r.toLowerCase().includes(lq)).slice(0, 3);

  const hasCatOrCity = matchedCategories.length > 0 || matchedCities.length > 0;
  const hasAnything = matchedRecent.length > 0 || events.length > 0 || hasCatOrCity;

  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden z-50">

      {/* Recent searches */}
      {matchedRecent.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            Tìm kiếm gần đây
          </p>
          {matchedRecent.map((r) => (
            <div key={r} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 group">
              <Clock className="size-3.5 text-stone-400 shrink-0" />
              <button className="flex-1 text-left text-sm text-stone-700" onClick={() => onSelect(r)}>
                {r}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveRecent(r); }}
                className="text-stone-300 hover:text-stone-500 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className={matchedRecent.length > 0 ? "border-t border-stone-100" : ""}>
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            Sự kiện
          </p>
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => onSelect(ev.title)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 text-left"
            >
              {/* Thumbnail */}
              <div className="size-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                {ev.imageUrl ? (
                  <img src={resolveImageUrl(ev.imageUrl) ?? ""} alt={ev.title} className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
                    {ev.title[0]}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{ev.title}</p>
                <p className="text-xs text-stone-400 truncate">
                  {formatDate(ev.startAt)}{ev.venue ? ` · ${ev.venue}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Categories + Locations */}
      {hasCatOrCity && (
        <div className={(matchedRecent.length > 0 || events.length > 0) ? "border-t border-stone-100" : ""}>
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            {matchedCategories.length > 0 && matchedCities.length > 0
              ? "Thể loại · Địa điểm"
              : matchedCategories.length > 0 ? "Thể loại" : "Địa điểm"}
          </p>
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {matchedCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => onSelect(cat)}
                className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors"
              >
                <LayoutGrid className="size-3 text-violet-500" />
                {cat}
              </button>
            ))}
            {matchedCities.map((city) => (
              <button
                key={city}
                onClick={() => onSelect(city)}
                className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors"
              >
                <MapPin className="size-3 text-emerald-500" />
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!hasAnything && (
        <p className="px-4 py-5 text-sm text-stone-400 text-center">Không tìm thấy gợi ý.</p>
      )}

      {/* Footer — show all events */}
      <div className="border-t border-stone-100">
        <Link
          href={query ? `/events?q=${encodeURIComponent(query)}` : "/events"}
          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
        >
          Xem tất cả sự kiện
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
