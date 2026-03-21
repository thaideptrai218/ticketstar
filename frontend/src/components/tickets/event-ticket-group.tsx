"use client";

// Collapsible event group — shows event header with ticket count, expands to show individual tickets
import { useState } from "react";
import { Calendar, ChevronDown, MapPin, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TicketCard } from "@/components/tickets/ticket-card";
import { formatDate, formatTime } from "@/lib/format-utils";
import type { MyTicket } from "@/types/tickets";

interface EventTicketGroupProps {
  eventId: string;
  eventTitle: string;
  eventVenue: string | null;
  eventStartAt: string;
  tickets: MyTicket[];
  onTransferSuccess: () => void;
}

export function EventTicketGroup({
  eventTitle,
  eventVenue,
  eventStartAt,
  tickets,
  onTransferSuccess,
}: EventTicketGroupProps) {
  const [open, setOpen] = useState(false);

  const usedCount = tickets.filter((t) => t.isCheckedIn).length;
  const unusedCount = tickets.length - usedCount;
  const isPast = new Date(eventStartAt) < new Date();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Group header — click to toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-stone-50/70 transition-colors"
      >
        {/* Event icon */}
        <div className="shrink-0 flex size-11 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
          <Ticket className="size-5 text-amber-600" />
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-900 text-sm leading-snug line-clamp-1">
            {eventTitle}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <Calendar className="size-3" />
              {formatDate(eventStartAt)} · {formatTime(eventStartAt)}
            </span>
            {eventVenue && (
              <span className="flex items-center gap-1 text-xs text-stone-500">
                <MapPin className="size-3" />
                <span className="line-clamp-1 max-w-[140px]">{eventVenue}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: counts + chevron */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Ticket count badges */}
          <div className="flex items-center gap-1.5">
            <Badge className="bg-stone-100 text-stone-600 border-stone-200 text-xs px-2 py-0.5 font-medium">
              {tickets.length} vé
            </Badge>
            {unusedCount > 0 && !isPast && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0.5">
                {unusedCount} chưa dùng
              </Badge>
            )}
            {isPast && usedCount < tickets.length && (
              <Badge className="bg-red-50 text-red-600 border-red-100 text-xs px-2 py-0.5">
                {unusedCount} bỏ lỡ
              </Badge>
            )}
          </div>
          <ChevronDown
            className={`size-4 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded ticket list */}
      {open && (
        <div className="border-t border-stone-100 px-4 py-4 flex flex-col gap-3 bg-stone-50/40">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onTransferSuccess={onTransferSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}
