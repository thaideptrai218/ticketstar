"use client";

// Payout summary page — all events with revenue breakdown
import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EventStatsCard } from "@/components/organizer/event-stats-card";
import { PayoutSummaryCard } from "@/components/organizer/payout-summary-card";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/format-utils";
import type { OrganizerPayoutOverview } from "@/types/organizer";

export default function PayoutPage() {
  const [overview, setOverview] = useState<OrganizerPayoutOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<OrganizerPayoutOverview>("/api/payout/summary")
      .then(setOverview)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  if (!overview) return <p className="text-red-500">Không thể tải dữ liệu thanh toán.</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-900">Thanh toán</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <EventStatsCard title="Tổng doanh thu" value={formatPrice(overview.totalRevenue)} icon={DollarSign} />
        <EventStatsCard title="Phí nền tảng" value={formatPrice(overview.totalFees)} icon={DollarSign} description="Tổng phí đã trừ" />
        <EventStatsCard title="Thực nhận" value={formatPrice(overview.totalNetPayout)} icon={DollarSign} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Chi tiết theo sự kiện</h2>
        {overview.events.length === 0 ? (
          <p className="text-sm text-stone-400">Chưa có dữ liệu thanh toán.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {overview.events.map((p) => <PayoutSummaryCard key={p.eventId} payout={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
