"use client";

// Order history page — lists all orders for the current attendee
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/components/orders/order-card";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { Order } from "@/types/orders";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Order[]>("/api/orders");
        setOrders(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không thể tải danh sách đơn hàng.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Đơn hàng</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="size-16 rounded-full bg-stone-100 flex items-center justify-center">
            <ShoppingBag className="size-7 text-stone-400" />
          </div>
          <div>
            <p className="text-base font-medium text-stone-700">Bạn chưa có đơn hàng nào</p>
            <p className="text-sm text-stone-400 mt-1">Tìm sự kiện yêu thích và đặt vé</p>
          </div>
          <Button variant="outline" className="mt-2 border-amber-200 text-amber-700 hover:bg-amber-50" asChild>
            <Link href="/events">Khám phá sự kiện</Link>
          </Button>
        </div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
