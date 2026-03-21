"use client";

// Admin dashboard — system overview with real stats
import { useState, useEffect } from "react";
import {
  CalendarDays,
  ShoppingCart,
  Users,
  TrendingUp,
  Activity,
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  userCount: number;
  eventCount: number;
  orderCount: number;
  ticketCount: number;
  totalRevenue: number;
  pendingOrders: number;
  recentEvents: { id: string; title: string; status: string; createdAt: string }[];
  recentOrders: { id: string; status: string; totalAmount: number; createdAt: string }[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  accent: string;
  iconColor: string;
}

function StatCard({ title, value, icon: Icon, description, accent, iconColor }: StatCardProps) {
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
          <Icon className={`size-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

const ORDER_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  Paid: { label: "Đã thanh toán", variant: "default" },
  Pending: { label: "Chờ thanh toán", variant: "secondary" },
  Cancelled: { label: "Đã hủy", variant: "destructive" },
  Expired: { label: "Hết hạn", variant: "outline" },
  Refunded: { label: "Hoàn tiền", variant: "outline" },
};

const EVENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  Published: { label: "Đang mở", color: "text-emerald-600 bg-emerald-50" },
  Draft: { label: "Nháp", color: "text-stone-500 bg-stone-100" },
  Cancelled: { label: "Đã hủy", color: "text-red-600 bg-red-50" },
  Ended: { label: "Kết thúc", color: "text-blue-600 bg-blue-50" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminStats>("/api/admin/stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Người dùng"
          value={stats?.userCount ?? 0}
          icon={Users}
          description="Tổng tài khoản đã đăng ký"
          accent="bg-blue-500"
          iconColor="text-blue-700"
        />
        <StatCard
          title="Sự kiện"
          value={stats?.eventCount ?? 0}
          icon={CalendarDays}
          description="Tổng sự kiện trên nền tảng"
          accent="bg-amber-500"
          iconColor="text-amber-700"
        />
        <StatCard
          title="Đơn hàng"
          value={stats?.orderCount ?? 0}
          icon={ShoppingCart}
          description={`${stats?.pendingOrders ?? 0} đơn chờ thanh toán`}
          accent="bg-violet-500"
          iconColor="text-violet-700"
        />
        <StatCard
          title="Vé đã bán"
          value={stats?.ticketCount ?? 0}
          icon={Ticket}
          description="Tổng vé đã phát hành"
          accent="bg-emerald-500"
          iconColor="text-emerald-700"
        />
      </div>

      {/* Revenue highlight */}
      <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-700">Tổng doanh thu</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-amber-900">
              {formatCurrency(stats?.totalRevenue ?? 0)}
            </p>
            <p className="mt-1 text-xs text-amber-600">Từ các đơn hàng đã thanh toán</p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100">
            <TrendingUp className="size-7 text-amber-700" />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent events */}
        <div className="rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-stone-50 px-6 py-4">
            <CalendarDays className="size-4 text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-700">Sự kiện gần đây</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {stats?.recentEvents.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-stone-400">Chưa có sự kiện nào.</p>
            )}
            {stats?.recentEvents.map((event) => {
              const statusInfo = EVENT_STATUS_MAP[event.status] ?? { label: event.status, color: "text-stone-500 bg-stone-100" };
              return (
                <div key={event.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">{event.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-400">
                      <Clock className="size-3" />
                      {timeAgo(event.createdAt)}
                    </div>
                  </div>
                  <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-stone-50 px-6 py-4">
            <ShoppingCart className="size-4 text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-700">Đơn hàng gần đây</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {stats?.recentOrders.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-stone-400">Chưa có đơn hàng nào.</p>
            )}
            {stats?.recentOrders.map((order) => {
              const statusInfo = ORDER_STATUS_MAP[order.status] ?? { label: order.status, variant: "outline" as const };
              return (
                <div key={order.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800">{formatCurrency(order.totalAmount)}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-400">
                      {order.status === "Paid" ? (
                        <CheckCircle2 className="size-3 text-emerald-500" />
                      ) : order.status === "Cancelled" || order.status === "Expired" ? (
                        <XCircle className="size-3 text-red-400" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      {timeAgo(order.createdAt)}
                    </div>
                  </div>
                  <Badge variant={statusInfo.variant} className="ml-3 shrink-0 text-xs">
                    {statusInfo.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
