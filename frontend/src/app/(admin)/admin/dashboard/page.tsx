"use client";

// Admin dashboard — overview stats
import { useState, useEffect } from "react";
import { CalendarDays, ShoppingCart, Users, TrendingUp, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import type { AdminUsersResponse } from "@/types/organizer";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  accent: string;
}

function StatCard({ title, value, icon: Icon, description, accent }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
      <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-4 translate-x-4 rounded-full opacity-10 ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
          </p>
          {description && <p className="mt-1 text-xs text-stone-400">{description}</p>}
        </div>
        <div className={`flex size-10 items-center justify-center rounded-xl ${accent} bg-opacity-15`}>
          <Icon className="size-5 text-stone-700" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [users, events] = await Promise.all([
          apiFetch<AdminUsersResponse>("/api/admin/users?page=1&pageSize=1"),
          apiFetch<{ total?: number; items?: unknown[] }>("/api/events?page=1&pageSize=1").catch(() => ({ total: 0 })),
        ]);
        setUserCount(users.total);
        setEventCount((events as { total?: number }).total ?? 0);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100">
          <Activity className="size-5 text-amber-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">Tổng quan hệ thống</h2>
          <p className="text-sm text-stone-500">Thống kê hoạt động trên nền tảng</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Người dùng"
          value={userCount}
          icon={Users}
          description="Tổng tài khoản đã đăng ký"
          accent="bg-blue-500"
        />
        <StatCard
          title="Sự kiện"
          value={eventCount}
          icon={CalendarDays}
          description="Sự kiện đang hoạt động"
          accent="bg-amber-500"
        />
        <StatCard
          title="Đơn hàng"
          value="—"
          icon={ShoppingCart}
          description="Chưa có dữ liệu"
          accent="bg-emerald-500"
        />
      </div>

      {/* Quick insights */}
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4 text-stone-500" />
          <h3 className="text-sm font-semibold text-stone-700">Hoạt động gần đây</h3>
        </div>
        <p className="text-sm text-stone-400 text-center py-8">Chưa có dữ liệu hoạt động.</p>
      </div>
    </div>
  );
}
