"use client";

// Ticket card showing event info, QR thumbnail, and transfer action
import { useState } from "react";
import { Calendar, MapPin, QrCode, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format-utils";
import { TicketQrDisplay } from "@/components/tickets/ticket-qr-display";
import { TicketTransferDialog } from "@/components/tickets/ticket-transfer-dialog";
import type { MyTicket } from "@/types/tickets";

interface TicketCardProps {
  ticket: MyTicket;
  onTransferSuccess: () => void;
}

export function TicketCard({ ticket, onTransferSuccess }: TicketCardProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="flex gap-4 p-5">
          {/* QR placeholder — click to open full QR dialog (avoids base64 decode on list render) */}
          <button
            onClick={() => setQrOpen(true)}
            className="shrink-0 flex size-[76px] items-center justify-center rounded-lg border border-stone-100 bg-stone-50 hover:border-amber-300 hover:bg-amber-50 transition-colors"
            title="Xem mã QR"
          >
            <QrCode className="size-8 text-stone-400" />
          </button>

          {/* Event info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-stone-900 line-clamp-2 text-sm leading-snug">
                {ticket.eventTitle}
              </h3>
              <Badge
                variant={ticket.isCheckedIn ? "secondary" : "outline"}
                className={
                  ticket.isCheckedIn
                    ? "shrink-0 bg-green-100 text-green-700 border-green-200"
                    : "shrink-0 text-amber-700 border-amber-200"
                }
              >
                {ticket.isCheckedIn ? "Đã dùng" : "Chưa dùng"}
              </Badge>
            </div>

            <p className="mt-1 text-xs font-medium text-amber-700">{ticket.ticketTypeName}</p>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Calendar className="size-3.5 shrink-0" />
                <span>{formatDate(ticket.eventStartAt)} · {formatTime(ticket.eventStartAt)}</span>
              </div>
              {ticket.eventVenue && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="line-clamp-1">{ticket.eventVenue}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-stone-100 px-5 py-3 flex items-center justify-between gap-2 bg-stone-50/50">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setQrOpen(true)}
            className="text-stone-600 hover:text-stone-900 gap-1.5"
          >
            <QrCode className="size-4" />
            Xem QR
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTransferOpen(true)}
            disabled={ticket.isCheckedIn}
            className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-40"
          >
            <Send className="size-3.5" />
            Chuyển vé
          </Button>
        </div>
      </div>

      <TicketQrDisplay
        open={qrOpen}
        onOpenChange={setQrOpen}
        ticketId={ticket.id}
        eventTitle={ticket.eventTitle}
        ticketTypeName={ticket.ticketTypeName}
        eventStartAt={ticket.eventStartAt}
      />

      <TicketTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        ticketId={ticket.id}
        eventTitle={ticket.eventTitle}
        onSuccess={onTransferSuccess}
      />
    </>
  );
}
