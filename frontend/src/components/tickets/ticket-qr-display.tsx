"use client";

// Full-screen QR code dialog for ticket scanning
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatTime } from "@/lib/format-utils";

interface TicketQrDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCodeBase64: string;
  eventTitle?: string;
  ticketTypeName?: string;
  eventStartAt?: string;
}

export function TicketQrDisplay({
  open,
  onOpenChange,
  qrCodeBase64,
  eventTitle,
  ticketTypeName,
  eventStartAt,
}: TicketQrDisplayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-stone-900">Mã QR vé</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* QR Code image from backend base64 PNG */}
          <div className="rounded-xl border border-stone-200 p-3 bg-white shadow-sm">
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code vé"
              className="size-56 object-contain"
            />
          </div>

          {/* Ticket info — show available fields */}
          {(eventTitle || ticketTypeName || eventStartAt) && (
            <div className="w-full rounded-lg bg-stone-50 border border-stone-100 px-4 py-3 text-center space-y-1">
              {eventTitle && <p className="font-semibold text-stone-900 line-clamp-2">{eventTitle}</p>}
              {ticketTypeName && <p className="text-sm text-amber-700 font-medium">{ticketTypeName}</p>}
              {eventStartAt && (
                <p className="text-sm text-stone-500">
                  {formatDate(eventStartAt)} · {formatTime(eventStartAt)}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
