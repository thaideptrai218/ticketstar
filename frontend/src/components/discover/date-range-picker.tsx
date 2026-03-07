"use client";

// Dual-month calendar date range picker with preset quick filters
// Design: Vietnamese labels, Mon-Sun grid, range highlight, reset/apply actions
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TimePreset = "all" | "today" | "tomorrow" | "this-week" | "this-month" | "custom";

export interface DateRange {
  preset: TimePreset;
  from?: Date;
  to?: Date;
}

interface Props {
  value: DateRange;
  onApply: (range: DateRange) => void;
  onClose: () => void;
}

const PRESETS: { value: TimePreset; label: string }[] = [
  { value: "all", label: "Tất cả các ngày" },
  { value: "today", label: "Hôm nay" },
  { value: "tomorrow", label: "Ngày mai" },
  { value: "this-week", label: "Tuần này" },
  { value: "this-month", label: "Tháng này" },
];

const DAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const VN_MONTHS = [
  "Tháng 01", "Tháng 02", "Tháng 03", "Tháng 04", "Tháng 05", "Tháng 06",
  "Tháng 07", "Tháng 08", "Tháng 09", "Tháng 10", "Tháng 11", "Tháng 12",
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Converts a preset to a concrete { from, to } date range for calendar highlighting
function presetToDates(preset: TimePreset): { from?: Date; to?: Date } {
  const now = new Date();
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = day(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "tomorrow": {
      const t = new Date(today); t.setDate(t.getDate() + 1);
      return { from: t, to: t };
    }
    case "this-week": {
      const end = new Date(today); end.setDate(end.getDate() + 6);
      return { from: today, to: end };
    }
    case "this-month": {
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: today, to: end };
    }
    default:
      return { from: undefined, to: undefined };
  }
}

function buildGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon-first
  const days = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) grid.push(null);
  for (let d = 1; d <= days; d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

interface CalendarProps {
  year: number;
  month: number;
  from?: Date;
  to?: Date;
  hovered?: Date;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | undefined) => void;
}

function CalendarGrid({ year, month, from, to, hovered, onDayClick, onDayHover }: CalendarProps) {
  const grid = buildGrid(year, month);
  const rangeEnd = to ?? hovered;
  const todayDate = new Date();

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${d === "T7" || d === "CN" ? "text-red-400" : "text-stone-400"}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((date, i) => {
          if (!date) return <div key={i} className="h-9" />;

          const isFrom = !!from && isSameDay(date, from);
          const isTo = !!to && isSameDay(date, to);
          const isToday = isSameDay(date, todayDate);
          const isPast = date < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          // Range highlight: between from and rangeEnd
          const inRange = !!from && !!rangeEnd && date > from && date < rangeEnd;
          const isRangeStart = isFrom && !!rangeEnd;
          const isRangeEnd = isTo || (!!from && !!hovered && !to && isSameDay(date, hovered));

          return (
            <div
              key={i}
              className={[
                "flex items-center justify-center h-9",
                inRange ? "bg-blue-100" : "",
                isRangeStart && !isTo ? "rounded-l-full bg-blue-100" : "",
                isRangeEnd && !isFrom ? "rounded-r-full bg-blue-100" : "",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={isPast}
                onClick={() => onDayClick(date)}
                onMouseEnter={() => onDayHover(date)}
                onMouseLeave={() => onDayHover(undefined)}
                className={[
                  "w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  isPast ? "text-stone-300 cursor-default" : "cursor-pointer",
                  isFrom || isTo ? "bg-blue-500 text-white" : "",
                  !isFrom && !isTo && !isPast
                    ? isWeekend ? "text-red-500 hover:bg-stone-100" : "text-stone-700 hover:bg-stone-100"
                    : "",
                  isToday && !isFrom && !isTo ? "ring-1 ring-blue-400" : "",
                ].join(" ")}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ value, onApply, onClose }: Props) {
  const today = new Date();
  const [leftMonth, setLeftMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // Initialise from/to from explicit dates or by resolving the preset
  const initDates = value.from ? { from: value.from, to: value.to } : presetToDates(value.preset);
  const [from, setFrom] = useState<Date | undefined>(initDates.from);
  const [to, setTo] = useState<Date | undefined>(initDates.to);
  const [hovered, setHovered] = useState<Date | undefined>();
  const [activePreset, setActivePreset] = useState<TimePreset>(value.preset);

  const rightMonth = leftMonth.month === 11
    ? { year: leftMonth.year + 1, month: 0 }
    : { year: leftMonth.year, month: leftMonth.month + 1 };

  function prevMonth() {
    setLeftMonth((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 });
  }
  function nextMonth() {
    setLeftMonth((p) => p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 });
  }

  function handleDayClick(date: Date) {
    setActivePreset("custom");
    if (!from || (from && to)) {
      setFrom(date);
      setTo(undefined);
    } else {
      if (date < from) { setFrom(date); setTo(from); }
      else setTo(date);
    }
  }

  function handleReset() {
    setActivePreset("all");
    setFrom(undefined);
    setTo(undefined);
  }

  const monthLabel = (m: { year: number; month: number }) => `${VN_MONTHS[m.month]}, ${m.year}`;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-xl p-5 w-[640px]">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => {
              setActivePreset(p.value);
              const dates = presetToDates(p.value);
              setFrom(dates.from);
              setTo(dates.to);
            }}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activePreset === p.value
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Dual month calendars */}
      <div className="flex gap-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-stone-100 text-stone-500">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold text-stone-900">{monthLabel(leftMonth)}</span>
            <div className="w-6" />
          </div>
          <CalendarGrid {...leftMonth} from={from} to={to} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="w-6" />
            <span className="text-sm font-semibold text-stone-900">{monthLabel(rightMonth)}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-stone-100 text-stone-500">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <CalendarGrid {...rightMonth} from={from} to={to} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered} />
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-stone-200" />

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={handleReset}>
          Thiết lập lại
        </Button>
        <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { onApply({ preset: activePreset, from, to }); onClose(); }}>
          Áp dụng
        </Button>
      </div>
    </div>
  );
}
