"use client";

// Admin dashboard — overview stats
import { useState, useEffect } from "react";
import { CalendarDays, ShoppingCart, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EventStatsCard } from "@/components/organizer/event-stats-card";
import { apiFetch } from "@/lib/api-client";
import type { AdminUsersResponse } from "@/types/organizer";
import type { EventListItem } from "@/types/events";

export default function AdminDashboardPage() {
  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [users, events] = await Promise.all([
          apiFetch<AdminUsersResponse>("/api/admin/users?page=1&pageSize=1"),
          apiFetch<EventListItem[]>("/api/events?page=1&pageSize=1").catch(() => []),
        ]);
        setUserCount(users.total);
        setEventCount(Array.isArray(events) ? events.length : 0);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-900">Quản trị viên</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <EventStatsCard title="Người dùng" value={userCount} icon={Users} />
        <EventStatsCard title="Sự kiện" value={eventCount} icon={CalendarDays} />
        <EventStatsCard title="Đơn hàng" value="—" icon={ShoppingCart} description="Xem chi tiết tại Thanh toán" />
      </div>
    </div>
  );
}
