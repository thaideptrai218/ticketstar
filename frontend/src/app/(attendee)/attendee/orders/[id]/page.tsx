"use client";

// Order detail page — fetches single order and renders OrderDetailView
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailView } from "@/components/orders/order-detail";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { OrderDetail } from "@/types/orders";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<OrderDetail>(`/api/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tải thông tin đơn hàng.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!order) return null;

  return (
    <OrderDetailView
      order={order}
      onCancelSuccess={() => {
        // Refetch to get updated status, then redirect back to list
        fetchOrder();
      }}
    />
  );
}
