"use client";

// Full-screen QR code dialog — fetches QR on demand when opened
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/format-utils";

interface TicketQrDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  eventTitle?: string;
  ticketTypeName?: string;
  eventStartAt?: string;
}

export function TicketQrDisplay({
  open,
  onOpenChange,
  ticketId,
  eventTitle,
  ticketTypeName,
  eventStartAt,
}: TicketQrDisplayProps) {
  const { data, isLoading } = useQuery<{ qrCodeBase64: string }>({
    queryKey: ["ticket-qr", ticketId],
    queryFn: () => apiFetch<{ qrCodeBase64: string }>(`/api/tickets/${ticketId}/qr`),
    enabled: open, // only fetch when dialog is opened
    staleTime: 5 * 60_000, // cache QR for 5 min
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-stone-900">Mã QR vé</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* QR Code — fetched on demand */}
          <div className="rounded-xl border border-stone-200 p-3 bg-white shadow-sm">
            {isLoading || !data ? (
              <Skeleton className="size-56 rounded-lg" />
            ) : (
              <img
                src={`data:image/png;base64,${data.qrCodeBase64}`}
                alt="QR Code vé"
                className="size-56 object-contain"
              />
            )}
          </div>

          {/* Ticket info */}
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
