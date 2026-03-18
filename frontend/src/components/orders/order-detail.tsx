"use client";

// Order detail view — items table, payment info, tickets with QR, cancel action
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, QrCode, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TicketQrDisplay } from "@/components/tickets/ticket-qr-display";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatPrice, formatDate, formatTime } from "@/lib/format-utils";
import { ORDER_STATUS_CONFIG } from "@/lib/order-status-config";
import type { OrderDetail, OrderTicket } from "@/types/orders";

interface OrderDetailProps {
  order: OrderDetail;
  onCancelSuccess: () => void;
}

export function OrderDetailView({ order, onCancelSuccess }: OrderDetailProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OrderTicket | null>(null);

  const statusConfig = ORDER_STATUS_CONFIG[order.status] ?? {
    label: order.status,
    className: "bg-stone-100 text-stone-500 border-stone-200",
  };

  async function handleCancel() {
    setIsCancelling(true);
    try {
      await apiFetch(`/api/orders/${order.id}/cancel`, { method: "POST" });
      toast.success("Đã hủy đơn hàng.");
      setCancelOpen(false);
      onCancelSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Hủy đơn thất bại. Vui lòng thử lại.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      {/* Back link */}
      <Link
        href="/attendee/orders"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 mb-6"
      >
        <ArrowLeft className="size-4" />
        Quay lại đơn hàng
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-stone-400 font-mono mb-1">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="text-2xl font-bold text-stone-900">Chi tiết đơn hàng</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
          {order.status === "Pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelOpen(true)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-1.5"
            >
              <XCircle className="size-4" />
              Hủy đơn
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Order items */}
        <section className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-900">Danh sách vé</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {order.items.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-stone-800">{item.ticketTypeName || "Vé sự kiện"}</p>
                  <p className="text-xs text-stone-400">
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                <span className="font-medium text-stone-900">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex justify-between">
            <span className="font-semibold text-stone-700">Tổng cộng</span>
            <span className="font-bold text-lg text-stone-900">{formatPrice(order.totalAmount)}</span>
          </div>
        </section>

        {/* Timestamps */}
        <section className="rounded-2xl border border-stone-200 bg-white px-5 py-4 space-y-2">
          <h2 className="font-semibold text-stone-900 mb-3">Thông tin đơn hàng</h2>
          <InfoRow label="Ngày đặt" value={`${formatDate(order.createdAt)} · ${formatTime(order.createdAt)}`} />
          {order.paidAt && (
            <InfoRow label="Thanh toán lúc" value={`${formatDate(order.paidAt)} · ${formatTime(order.paidAt)}`} />
          )}
          {order.expiresAt && order.status === "Pending" && (
            <InfoRow label="Hết hạn lúc" value={`${formatDate(order.expiresAt)} · ${formatTime(order.expiresAt)}`} />
          )}
        </section>

        {/* Payment info */}
        {order.payment && (
          <section className="rounded-2xl border border-stone-200 bg-white px-5 py-4 space-y-2">
            <h2 className="font-semibold text-stone-900 mb-3">Thanh toán</h2>
            <InfoRow label="Nhà cung cấp" value={order.payment.provider} />
            <InfoRow label="Số tiền" value={formatPrice(order.payment.amount)} />
            {order.payment.externalRef && (
              <InfoRow label="Mã giao dịch" value={order.payment.externalRef} />
            )}
            {order.payment.processedAt && (
              <InfoRow label="Thời gian xử lý" value={`${formatDate(order.payment.processedAt)} · ${formatTime(order.payment.processedAt)}`} />
            )}
          </section>
        )}

        {/* Tickets with QR — only when Paid */}
        {order.status === "Paid" && order.tickets && order.tickets.length > 0 && (
          <section className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">Vé của bạn</h2>
            </div>
            <div className="divide-y divide-stone-100">
              {order.tickets.map((ticket) => (
                <div key={ticket.id} className="px-5 py-3 flex items-center gap-4">
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    className="shrink-0 flex size-14 items-center justify-center rounded-lg border border-stone-100 bg-stone-50 hover:border-amber-300 transition-colors"
                    title="Xem QR"
                  >
                    <QrCode className="size-7 text-stone-400" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {ticket.ticketTypeName || "Vé sự kiện"}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        ticket.isCheckedIn
                          ? "mt-1 bg-green-100 text-green-700 border-green-200 text-xs"
                          : "mt-1 text-amber-700 border-amber-200 text-xs"
                      }
                    >
                      {ticket.isCheckedIn ? "Đã dùng" : "Chưa dùng"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedTicket(ticket)}
                    className="gap-1.5 text-stone-500 hover:text-stone-900"
                  >
                    <QrCode className="size-4" />
                    Xem QR
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận hủy đơn</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={isCancelling}>
              Không
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancelling ? "Đang hủy..." : "Hủy đơn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR fullscreen dialog for individual ticket */}
      {selectedTicket && (
        <TicketQrDisplay
          open={!!selectedTicket}
          onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}
          ticketId={selectedTicket.id}
          ticketTypeName={selectedTicket.ticketTypeName || "Vé sự kiện"}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-800 font-medium text-right">{value}</span>
    </div>
  );
}
