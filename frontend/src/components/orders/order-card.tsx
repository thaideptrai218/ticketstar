"use client";

// Order list card — shows summary info and navigates to detail on click
import { useRouter } from "next/navigation";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/format-utils";
import { ORDER_STATUS_CONFIG } from "@/lib/order-status-config";
import type { Order } from "@/types/orders";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const router = useRouter();
  const statusConfig = ORDER_STATUS_CONFIG[order.status] ?? {
    label: order.status,
    className: "bg-stone-100 text-stone-500 border-stone-200",
  };

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <button
      onClick={() => router.push(`/attendee/orders/${order.id}`)}
      className="w-full text-left rounded-2xl border border-stone-200 bg-white shadow-sm px-5 py-4 hover:shadow-md hover:border-stone-300 transition-all duration-200 flex items-center gap-4 cursor-pointer"
    >
      <div className="shrink-0 size-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
        <ShoppingBag className="size-5 text-amber-700" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-stone-400 font-mono">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <Badge variant="outline" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-sm text-stone-500">
            {formatDate(order.createdAt)} · {totalItems} vé
          </span>
          <span className="font-semibold text-stone-900">
            {formatPrice(order.totalAmount)}
          </span>
        </div>

        {/* Ticket type names */}
        <p className="mt-1 text-xs text-stone-400 line-clamp-1">
          {order.items.map((item) =>
            item.quantity > 1 ? `${item.ticketTypeName} ×${item.quantity}` : item.ticketTypeName
          ).join(" · ")}
        </p>
      </div>

      <ChevronRight className="size-4 text-stone-400 shrink-0" />
    </button>
  );
}
