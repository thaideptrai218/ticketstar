"use client";

// Order detail page — fetches single order and renders OrderDetailView
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailView } from "@/components/orders/order-detail";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { OrderDetail } from "@/types/orders";

export default function OrderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const { data: order, isLoading, error, refetch } = useQuery<OrderDetail>({
    queryKey: ["order", orderId],
    queryFn: () => apiFetch<OrderDetail>(`/api/orders/${orderId}`),
    staleTime: 30_000,
    retry: 1,
  });

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
        {error instanceof ApiError ? error.message : "Không thể tải thông tin đơn hàng."}
      </div>
    );
  }

  if (!order) return null;

  return (
    <OrderDetailView
      order={order}
      onCancelSuccess={() => {
        // Invalidate and refetch to get updated status
        queryClient.invalidateQueries({ queryKey: ["order", orderId] });
        refetch();
      }}
    />
  );
}
