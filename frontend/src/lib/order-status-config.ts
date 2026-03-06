// Shared order status badge config — used by order-card and order-detail
export const ORDER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Pending: { label: "Chờ thanh toán", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  Paid: { label: "Đã thanh toán", className: "bg-green-100 text-green-700 border-green-200" },
  Cancelled: { label: "Đã hủy", className: "bg-stone-100 text-stone-500 border-stone-200" },
  Refunded: { label: "Đã hoàn tiền", className: "bg-red-100 text-red-600 border-red-200" },
};
