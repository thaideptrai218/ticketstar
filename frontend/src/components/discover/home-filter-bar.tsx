"use client";

// Home page filter bar — time, price, location, and event type filters
// Price / Location / EventType are UI-only (backend filtering not yet implemented)
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, MapPin, Tag, LayoutGrid, X } from "lucide-react";
import { DateRangePicker, type DateRange, type TimePreset } from "./date-range-picker";

export interface HomeFilters {
  dateRange: DateRange;
  priceRange?: "free" | "under-100k" | "100k-500k" | "over-500k";
  location?: string;
  eventType?: string;
}

const DEFAULT_DATE_RANGE: DateRange = { preset: "all" };

const PRICE_OPTIONS = [
  { value: "free" as const, label: "Miễn phí" },
  { value: "under-100k" as const, label: "Dưới 100k" },
  { value: "100k-500k" as const, label: "100k – 500k" },
  { value: "over-500k" as const, label: "Trên 500k" },
];

const EVENT_TYPES = ["Âm nhạc", "Thể thao", "Nghệ thuật", "Công nghệ", "Ẩm thực", "Giáo dục"];

const PRESET_LABELS: Record<TimePreset, string> = {
  all: "Thời gian",
  today: "Hôm nay",
  tomorrow: "Ngày mai",
  "this-week": "Tuần này",
  "this-month": "Tháng này",
  custom: "",
};

function dateRangeLabel(range: DateRange): string {
  if (range.preset !== "custom") return PRESET_LABELS[range.preset];
  if (range.from && range.to) {
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `${fmt(range.from)} – ${fmt(range.to)}`;
  }
  if (range.from) return `Từ ${range.from.getDate()}/${range.from.getMonth() + 1}`;
  return "Thời gian";
}

// Click-outside dismissible dropdown wrapper
function Dropdown({ children, open, onClose }: { children: React.ReactNode; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return <div ref={ref} className="absolute top-full left-0 mt-2 z-50">{children}</div>;
}

// Shared filter button style
function FilterBtn({
  active, onClick, icon, label, open,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  open: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-amber-400 bg-amber-50 text-amber-700"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
      }`}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

interface Props {
  filters: HomeFilters;
  onFiltersChange: (f: HomeFilters) => void;
}

export function HomeFilterBar({ filters, onFiltersChange }: Props) {
  const [dateOpen, setDateOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [locationInput, setLocationInput] = useState(filters.location ?? "");

  // Sync local input when parent clears location (e.g. "Xóa bộ lọc")
  useEffect(() => {
    if (!filters.location) setLocationInput("");
  }, [filters.location]);

  const hasActive =
    filters.dateRange.preset !== "all" ||
    !!filters.priceRange ||
    !!filters.location ||
    !!filters.eventType;

  function clear() {
    setLocationInput("");
    onFiltersChange({ dateRange: DEFAULT_DATE_RANGE });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-4 border-b border-stone-100 mb-6">
      {/* Time / date */}
      <div className="relative">
        <FilterBtn
          active={filters.dateRange.preset !== "all"}
          open={dateOpen}
          onClick={() => setDateOpen((v) => !v)}
          icon={<Calendar className="size-3.5 shrink-0" />}
          label={dateRangeLabel(filters.dateRange)}
        />
        <Dropdown open={dateOpen} onClose={() => setDateOpen(false)}>
          <DateRangePicker
            value={filters.dateRange}
            onApply={(range) => onFiltersChange({ ...filters, dateRange: range })}
            onClose={() => setDateOpen(false)}
          />
        </Dropdown>
      </div>

      {/* Price */}
      <div className="relative">
        <FilterBtn
          active={!!filters.priceRange}
          open={priceOpen}
          onClick={() => setPriceOpen((v) => !v)}
          icon={<Tag className="size-3.5 shrink-0" />}
          label={filters.priceRange ? (PRICE_OPTIONS.find((p) => p.value === filters.priceRange)?.label ?? "Giá vé") : "Giá vé"}
        />
        <Dropdown open={priceOpen} onClose={() => setPriceOpen(false)}>
          <div className="bg-white border border-stone-200 rounded-xl shadow-xl p-2 min-w-[160px]">
            {PRICE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onFiltersChange({ ...filters, priceRange: filters.priceRange === opt.value ? undefined : opt.value });
                  setPriceOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  filters.priceRange === opt.value ? "bg-amber-50 text-amber-700 font-medium" : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Dropdown>
      </div>

      {/* Location */}
      <div className="relative">
        <FilterBtn
          active={!!filters.location}
          open={locationOpen}
          onClick={() => setLocationOpen((v) => !v)}
          icon={<MapPin className="size-3.5 shrink-0" />}
          label={filters.location ?? "Địa điểm"}
        />
        <Dropdown open={locationOpen} onClose={() => setLocationOpen(false)}>
          <div className="bg-white border border-stone-200 rounded-xl shadow-xl p-3 w-56">
            <input
              type="text"
              placeholder="Nhập thành phố, địa điểm..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onFiltersChange({ ...filters, location: locationInput.trim() || undefined });
                  setLocationOpen(false);
                }
              }}
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-stone-400">Nhấn Enter để áp dụng</p>
          </div>
        </Dropdown>
      </div>

      {/* Event type */}
      <div className="relative">
        <FilterBtn
          active={!!filters.eventType}
          open={typeOpen}
          onClick={() => setTypeOpen((v) => !v)}
          icon={<LayoutGrid className="size-3.5 shrink-0" />}
          label={filters.eventType ?? "Loại sự kiện"}
        />
        <Dropdown open={typeOpen} onClose={() => setTypeOpen(false)}>
          <div className="bg-white border border-stone-200 rounded-xl shadow-xl p-2 min-w-[160px]">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onFiltersChange({ ...filters, eventType: filters.eventType === type ? undefined : type });
                  setTypeOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  filters.eventType === type ? "bg-amber-50 text-amber-700 font-medium" : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </Dropdown>
      </div>

      {/* Clear all */}
      {hasActive && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 py-2 text-sm text-stone-500 hover:text-stone-700 hover:border-stone-300 transition-colors"
        >
          <X className="size-3.5" />
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}
