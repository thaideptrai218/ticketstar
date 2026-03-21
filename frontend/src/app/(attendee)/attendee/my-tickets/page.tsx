"use client";

// My Tickets page — tickets grouped by event with collapsible sections and filters
import { useMemo, useState } from "react";
import Link from "next/link";
import { TicketIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventTicketGroup } from "@/components/tickets/event-ticket-group";
import { apiFetch } from "@/lib/api-client";
import type { MyTicket } from "@/types/tickets";

type StatusFilter = "all" | "unused" | "used";
type TimeFilter = "all" | "upcoming" | "past";

function useMyTickets() {
  return useQuery<MyTicket[]>({
    queryKey: ["my-tickets"],
    queryFn: () => apiFetch<MyTicket[]>("/api/tickets"),
    staleTime: 60_000,
  });
}

/** Group a flat ticket list by eventId, preserving first-seen order */
function groupByEvent(tickets: MyTicket[]) {
  const map = new Map<string, { eventId: string; eventTitle: string; eventVenue: string | null; eventStartAt: string; tickets: MyTicket[] }>();
  for (const t of tickets) {
    if (!map.has(t.eventId)) {
      map.set(t.eventId, { eventId: t.eventId, eventTitle: t.eventTitle, eventVenue: t.eventVenue, eventStartAt: t.eventStartAt, tickets: [] });
    }
    map.get(t.eventId)!.tickets.push(t);
  }
  return Array.from(map.values());
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "unused", label: "Chưa dùng" },
  { value: "used", label: "Đã dùng" },
];

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "Mọi thời gian" },
  { value: "upcoming", label: "Sắp tới" },
  { value: "past", label: "Đã qua" },
];

export default function MyTicketsPage() {
  const { data: tickets, isLoading, error, refetch } = useMyTickets();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const now = new Date();

  const filteredGroups = useMemo(() => {
    if (!tickets) return [];

    const filtered = tickets.filter((t) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "used" && t.isCheckedIn) ||
        (statusFilter === "unused" && !t.isCheckedIn);

      const eventDate = new Date(t.eventStartAt);
      const matchTime =
        timeFilter === "all" ||
        (timeFilter === "upcoming" && eventDate >= now) ||
        (timeFilter === "past" && eventDate < now);

      return matchStatus && matchTime;
    });

    return groupByEvent(filtered);
  }, [tickets, statusFilter, timeFilter]);

  const totalFiltered = filteredGroups.reduce((n, g) => n + g.tickets.length, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-stone-900">Vé của tôi</h1>
        {tickets && tickets.length > 0 && (
          <span className="text-sm text-stone-400">{totalFiltered} vé</span>
        )}
      </div>

      {/* Filters */}
      {!isLoading && !error && tickets && tickets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Time filter */}
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeFilter(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeFilter === opt.value
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error instanceof Error ? error.message : "Không thể tải danh sách vé."}
        </div>
      )}

      {/* Empty — no tickets at all */}
      {!isLoading && !error && tickets?.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="size-16 rounded-full bg-stone-100 flex items-center justify-center">
            <TicketIcon className="size-7 text-stone-400" />
          </div>
          <div>
            <p className="text-base font-medium text-stone-700">Bạn chưa có vé nào</p>
            <p className="text-sm text-stone-400 mt-1">Khám phá sự kiện và đặt vé ngay</p>
          </div>
          <Button variant="outline" className="mt-2 border-amber-200 text-amber-700 hover:bg-amber-50" asChild>
            <Link href="/events">Khám phá sự kiện</Link>
          </Button>
        </div>
      )}

      {/* Empty — filter yields no results */}
      {!isLoading && !error && tickets && tickets.length > 0 && filteredGroups.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="size-12 rounded-full bg-stone-100 flex items-center justify-center">
            <TicketIcon className="size-5 text-stone-400" />
          </div>
          <p className="text-sm text-stone-500">Không có vé nào khớp với bộ lọc</p>
          <button
            onClick={() => { setStatusFilter("all"); setTimeFilter("all"); }}
            className="text-xs text-amber-700 underline underline-offset-2"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Event groups */}
      {!isLoading && !error && filteredGroups.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredGroups.map((group) => (
            <EventTicketGroup
              key={group.eventId}
              eventId={group.eventId}
              eventTitle={group.eventTitle}
              eventVenue={group.eventVenue}
              eventStartAt={group.eventStartAt}
              tickets={group.tickets}
              onTransferSuccess={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
