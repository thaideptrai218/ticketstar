"use client";

// Event orders view for organizer
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { OrdersTable } from "@/components/organizer/orders-table";
import { apiFetch } from "@/lib/api-client";
import type { Order } from "@/types/orders";

export default function EventOrdersPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch all orders — backend filters by auth; for organizer context we show event-related
    apiFetch<Order[]>("/api/orders")
      .then(setOrders)
      .finally(() => setIsLoading(false));
  }, [eventId]);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Đơn hàng</h1>
      <OrdersTable orders={orders} />
    </div>
  );
}
