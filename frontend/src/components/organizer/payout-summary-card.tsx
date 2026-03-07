"use client";

// Payout summary card for organizer payout overview
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/format-utils";
import type { PayoutSummary } from "@/types/organizer";

interface PayoutSummaryCardProps {
  payout: PayoutSummary;
}

export function PayoutSummaryCard({ payout }: PayoutSummaryCardProps) {
  return (
    <Link href={`/organizer/payout/${payout.eventId}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-stone-900 line-clamp-1">{payout.eventTitle}</h3>
              <p className="text-xs text-stone-400 mt-1">Phí nền tảng: {payout.platformFeePercent}%</p>
            </div>
            <ArrowRight className="size-4 text-stone-400 shrink-0 mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div>
              <p className="text-xs text-stone-400">Doanh thu</p>
              <p className="text-sm font-semibold text-stone-800">{formatPrice(payout.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Phí</p>
              <p className="text-sm font-semibold text-red-500">-{formatPrice(payout.platformFeeAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Thực nhận</p>
              <p className="text-sm font-bold text-green-600">{formatPrice(payout.netPayout)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
