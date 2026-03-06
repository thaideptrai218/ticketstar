"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type PaymentState = "processing" | "success" | "failed" | "expired";

interface PaymentStatusProps {
  state: PaymentState;
  orderId?: string;
  eventSlug?: string;
}

export function PaymentStatus({ state, orderId, eventSlug }: PaymentStatusProps) {
  if (state === "processing") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Loader2 className="size-10 animate-spin text-amber-700" />
        <h2 className="text-xl font-semibold text-stone-900">Đang xử lý thanh toán...</h2>
        <p className="text-sm text-stone-500">Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="size-12 text-green-600" />
        <h2 className="text-xl font-semibold text-stone-900">Thanh toán thành công!</h2>
        <p className="text-sm text-stone-500">Vé của bạn đã sẵn sàng</p>
        <div className="flex gap-3 mt-4">
          <Button asChild className="bg-amber-800 hover:bg-amber-900">
            <Link href="/attendee/tickets">Xem vé của tôi</Link>
          </Button>
          <Button variant="outline" asChild className="border-stone-200">
            <Link href="/events">Tiếp tục khám phá</Link>
          </Button>
        </div>
      </div>
    );
  }

  // failed or expired
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <XCircle className="size-12 text-red-500" />
      <h2 className="text-xl font-semibold text-stone-900">
        {state === "expired" ? "Đơn hàng đã hết hạn" : "Thanh toán thất bại"}
      </h2>
      <p className="text-sm text-stone-500">
        {state === "expired"
          ? "Đơn hàng đã quá thời gian thanh toán cho phép."
          : "Đã xảy ra lỗi. Vui lòng thử lại."}
      </p>
      <Button variant="outline" asChild className="mt-4 border-stone-200">
        <Link href={eventSlug ? `/events/${eventSlug}` : "/events"}>
          Quay lại sự kiện
        </Link>
      </Button>
    </div>
  );
}

export type { PaymentState };
