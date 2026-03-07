"use client";

// Payout detail page — breakdown by ticket type for a single event
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/format-utils";
import type { PayoutSummary } from "@/types/organizer";

export default function PayoutDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [payout, setPayout] = useState<PayoutSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<PayoutSummary>(`/api/payout/events/${eventId}`)
      .then(setPayout)
      .finally(() => setIsLoading(false));
  }, [eventId]);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!payout) return <p className="text-red-500">Không tìm thấy dữ liệu thanh toán.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/organizer/payout"><ArrowLeft className="size-4" /></Link></Button>
        <h1 className="text-2xl font-bold text-stone-900">{payout.eventTitle}</h1>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 rounded-xl border border-stone-200 bg-white p-5 text-center">
        <div>
          <p className="text-xs text-stone-400">Doanh thu</p>
          <p className="text-lg font-bold text-stone-800">{formatPrice(payout.totalRevenue)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Phí ({payout.platformFeePercent}%)</p>
          <p className="text-lg font-bold text-red-500">-{formatPrice(payout.platformFeeAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Thực nhận</p>
          <p className="text-lg font-bold text-green-600">{formatPrice(payout.netPayout)}</p>
        </div>
      </div>

      {/* Ticket type breakdown */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loại vé</TableHead>
              <TableHead>Đã bán</TableHead>
              <TableHead>Đơn giá</TableHead>
              <TableHead>Thành tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payout.ticketTypeBreakdown.map((tt) => (
              <TableRow key={tt.ticketTypeId}>
                <TableCell className="font-medium">{tt.ticketTypeName}</TableCell>
                <TableCell>{tt.ticketsSold}</TableCell>
                <TableCell>{formatPrice(tt.unitPrice)}</TableCell>
                <TableCell className="font-semibold">{formatPrice(tt.subtotal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
