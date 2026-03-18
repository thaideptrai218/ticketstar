"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, Clock, MapPin, TicketIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateFull, formatTime, resolveImageUrl } from "@/lib/format-utils";
import { TicketTypeSelector, type TicketSelection } from "@/components/events/ticket-type-selector";
import type { EventDetail } from "@/types/events";

interface EventDetailClientProps {
  event: EventDetail;
}

export function EventDetailClient({ event }: EventDetailClientProps) {
  const [selection, setSelection] = useState<TicketSelection>({});
  const router = useRouter();

  const totalQty = Object.values(selection).reduce((sum, qty) => sum + qty, 0);

  const handleBuyTickets = () => {
    // Encode selection into URL search params for checkout page
    const items = Object.entries(selection)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => `${id}:${qty}`)
      .join(",");
    router.push(`/checkout?eventId=${event.id}&items=${items}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      {/* Hero image */}
      <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-stone-100">
        {resolveImageUrl(event.imageUrl) ? (
          <Image
            src={resolveImageUrl(event.imageUrl)!}
            alt={event.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            unoptimized={resolveImageUrl(event.imageUrl)!.includes("localhost")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <TicketIcon className="size-16" />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: details */}
        <div>
          <h1
            className="text-3xl font-bold text-stone-900 lg:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {event.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {formatDateFull(event.startAt)}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {formatTime(event.startAt)} - {formatTime(event.endAt)}
            </div>
            {event.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.venue}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <User className="size-4" />
              {event.organizerName}
            </div>
          </div>

          {event.description && (
            <div className="mt-6 prose prose-stone max-w-none text-stone-600">
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          )}
        </div>

        {/* Right: ticket selection */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Chọn vé</h2>
            <TicketTypeSelector
              ticketTypes={event.ticketTypes}
              selection={selection}
              onSelectionChange={setSelection}
            />
            <Button
              onClick={handleBuyTickets}
              disabled={totalQty === 0}
              className="mt-6 w-full h-11 bg-amber-800 hover:bg-amber-900"
            >
              {totalQty === 0
                ? "Chọn vé để tiếp tục"
                : `Mua ${totalQty} vé`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
