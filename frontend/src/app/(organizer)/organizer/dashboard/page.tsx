"use client";

// Organizer dashboard — overview stats + recent events
import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarDays, DollarSign, ShoppingCart, TicketIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EventStatsCard } from "@/components/organizer/event-stats-card";
import { apiFetch } from "@/lib/api-client";
import { formatPrice, formatDate } from "@/lib/format-utils";
import type { OrganizerEvent, OrganizerPayoutOverview } from "@/types/organizer";

export default function OrganizerDashboardPage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [payout, setPayout] = useState<OrganizerPayoutOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [evts, pay] = await Promise.all([
          apiFetch<OrganizerEvent[]>("/api/events/organizer/my-events"),
          apiFetch<OrganizerPayoutOverview>("/api/payout/summary").catch(() => null),
        ]);
        setEvents(evts);
        setPayout(pay);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const totalTickets = events.reduce((s, e) => s + e.totalTicketCount, 0);
  const soldTickets = events.reduce((s, e) => s + (e.totalTicketCount - e.availableTicketCount), 0);
  const upcoming = events.filter((e) => new Date(e.startAt) > new Date()).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Tổng quan</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EventStatsCard title="Sự kiện" value={events.length} icon={CalendarDays} description={`${upcoming} sắp diễn ra`} />
        <EventStatsCard title="Vé đã bán" value={soldTickets} icon={TicketIcon} description={`/ ${totalTickets} tổng`} />
        <EventStatsCard title="Đơn hàng" value={soldTickets} icon={ShoppingCart} />
        <EventStatsCard title="Doanh thu" value={formatPrice(payout?.totalRevenue ?? 0)} icon={DollarSign} />
      </div>

      {/* Recent events */}
      <div>
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Sự kiện gần đây</h2>
        {events.length === 0 ? (
          <p className="text-sm text-stone-400">Chưa có sự kiện nào. Hãy tạo sự kiện đầu tiên!</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 6).map((event) => (
              <Link
                key={event.id}
                href={`/organizer/events/${event.id}/edit`}
                className="rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-stone-900 line-clamp-1">{event.title}</h3>
                  <Badge variant={event.status === "Published" ? "default" : "secondary"} className={event.status === "Published" ? "bg-green-100 text-green-700" : ""}>
                    {event.status === "Published" ? "Đang bán" : "Nháp"}
                  </Badge>
                </div>
                <p className="text-xs text-stone-400 mt-1">{formatDate(event.startAt)}</p>
                <p className="text-xs text-stone-500 mt-0.5">{event.venue ?? "Chưa có địa điểm"}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
