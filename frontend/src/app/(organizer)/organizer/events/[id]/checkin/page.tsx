"use client";

// Check-in stats for organizer — auto-refresh every 10s
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Clock, TicketIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import type { CheckInStats } from "@/types/organizer";

export default function CheckinStatsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      try {
        const data = await apiFetch<CheckInStats>(`/api/checkin/events/${eventId}/stats`);
        if (active) setStats(data);
      } finally {
        if (active) setIsLoading(false);
      }
      if (active) timerRef.current = setTimeout(fetchStats, 10_000);
    }

    fetchStats();
    return () => { active = false; clearTimeout(timerRef.current); };
  }, [eventId]);

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!stats) return <p className="text-red-500">Không thể tải dữ liệu check-in.</p>;

  const pct = stats.totalTickets > 0 ? Math.round((stats.checkedInTickets / stats.totalTickets) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Thống kê check-in</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50">
              <TicketIcon className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Tổng vé</p>
              <p className="text-xl font-bold">{stats.totalTickets}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Đã check-in</p>
              <p className="text-xl font-bold">{stats.checkedInTickets}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Chưa check-in</p>
              <p className="text-xl font-bold">{stats.pendingTickets}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-700">Tiến độ check-in</span>
          <span className="text-sm font-bold text-amber-600">{pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-stone-400 mt-2">Tự động cập nhật mỗi 10 giây</p>
      </div>
    </div>
  );
}
