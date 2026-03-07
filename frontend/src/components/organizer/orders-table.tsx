"use client";

// Paginated orders table for organizer event view
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice, formatDate } from "@/lib/format-utils";
import type { Order } from "@/types/orders";

const ORDER_STATUS: Record<string, { label: string; class: string }> = {
  Pending: { label: "Chờ thanh toán", class: "bg-amber-100 text-amber-700" },
  Paid: { label: "Đã thanh toán", class: "bg-green-100 text-green-700" },
  Cancelled: { label: "Đã hủy", class: "bg-red-100 text-red-600" },
  Expired: { label: "Hết hạn", class: "bg-stone-100 text-stone-500" },
  Refunded: { label: "Hoàn tiền", class: "bg-blue-100 text-blue-600" },
};

interface OrdersTableProps {
  orders: Order[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  if (orders.length === 0) {
    return <p className="text-sm text-stone-400 py-8 text-center">Chưa có đơn hàng nào.</p>;
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã đơn</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Tổng tiền</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead>Vé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.Pending;
            const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}...</TableCell>
                <TableCell><Badge className={st.class}>{st.label}</Badge></TableCell>
                <TableCell>{formatPrice(o.totalAmount)}</TableCell>
                <TableCell className="text-sm text-stone-500">{formatDate(o.createdAt)}</TableCell>
                <TableCell>{totalQty} vé</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
