"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  TicketIcon,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatPrice,
  formatTime,
  resolveImageUrl,
} from "@/lib/format-utils";
import type { EventDetail, TicketType } from "@/types/events";

interface EventDetailClientProps {
  event: EventDetail;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Single collapsible ticket-type row
function TicketRow({ tt }: { tt: TicketType }) {
  const [open, setOpen] = useState(false);
  const soldOut = tt.availableCount === 0;
  const lowStock = !soldOut && tt.availableCount <= 10;

  return (
    <div className="border-b border-stone-100 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-stone-50"
      >
        <ChevronRight
          className={`size-3.5 shrink-0 text-stone-300 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <span className="flex-1 text-sm font-medium text-stone-800">{tt.name}</span>
        <div className="flex shrink-0 items-center gap-2.5">
          {soldOut ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-500">
              Hết vé
            </span>
          ) : (
            <>
              {lowStock && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                  Sắp hết
                </span>
              )}
              <span className="text-sm font-semibold text-amber-700">
                {formatPrice(tt.price)}
              </span>
            </>
          )}
        </div>
      </button>

      {open && (
        <div className="space-y-1.5 px-8 pb-4 pt-1 text-xs text-stone-400">
          {tt.description && (
            <p className="mb-2 text-sm leading-relaxed text-stone-500">{tt.description}</p>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span>
              Còn lại:{" "}
              <span className="font-medium text-stone-600">
                {tt.availableCount}/{tt.quota}
              </span>
            </span>
            {tt.maxPerUser > 1 && <span>Tối đa {tt.maxPerUser} vé/người</span>}
            {tt.saleEndAt && (
              <span>
                Hết hạn: <span className="text-stone-500">{formatDate(tt.saleEndAt)}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EventDetailClient({ event }: EventDetailClientProps) {
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const router = useRouter();

  const minPrice =
    event.ticketTypes.length > 0
      ? Math.min(...event.ticketTypes.map((t) => t.price))
      : null;

  const hasAvailableTickets = event.ticketTypes.some((t) => t.availableCount > 0);
  const handleBuy = () => router.push(`/checkout?eventId=${event.id}`);
  const imgSrc = resolveImageUrl(event.imageUrl);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* ── Hero ── */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-0 md:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">

          {/* Left info card */}
          <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-bold leading-snug text-stone-900 lg:text-xl">
              {event.title}
            </h1>

            <div className="mt-5 space-y-3">
              {/* Date */}
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <span className="text-sm font-medium text-amber-700">
                  {formatTime(event.startAt)} - {formatTime(event.endAt)},{" "}
                  {formatDate(event.startAt)}
                </span>
              </div>

              {/* Venue */}
              {event.venue && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">{event.venue}</p>
                    {event.category && (
                      <p className="mt-0.5 text-xs text-stone-400">{event.category}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Organizer */}
              <div className="flex items-center gap-2.5">
                {event.organizerLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(event.organizerLogoUrl) ?? ""}
                    alt={event.organizerName}
                    className="size-6 rounded-full object-cover shrink-0 ring-1 ring-stone-200"
                  />
                ) : (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                    {getInitials(event.organizerName)}
                  </div>
                )}
                <span className="text-sm text-stone-500">{event.organizerName}</span>
              </div>
            </div>

            <div className="flex-1" />

            {/* Divider + CTA */}
            <div className="mt-6 border-t border-stone-100 pt-5">
              {minPrice !== null && (
                <button
                  onClick={handleBuy}
                  className="mb-3 flex items-center gap-1 hover:opacity-75 transition-opacity"
                >
                  <span className="text-sm text-stone-400">Giá từ</span>
                  <span className="text-xl font-bold text-amber-700">
                    {formatPrice(minPrice)}
                  </span>
                  <ChevronRight className="size-4 text-amber-700" />
                </button>
              )}
              <Button
                onClick={handleBuy}
                disabled={!hasAvailableTickets}
                className="w-full h-11 rounded-xl bg-amber-700 text-white font-semibold text-sm hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasAvailableTickets ? "Mua vé ngay" : "Hết vé"}
              </Button>
            </div>
          </div>

          {/* Right: banner image */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm lg:aspect-auto lg:min-h-[340px]">
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={event.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                unoptimized={imgSrc.includes("localhost")}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-200">
                <TicketIcon className="size-24" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content sections ── */}
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 space-y-4">

        {/* Description — may contain HTML from rich-text editor */}
        {event.description && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-amber-700">
              Giới thiệu
            </h2>
            <div
              className="prose prose-stone prose-sm max-w-none prose-p:leading-relaxed prose-p:my-2 prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        )}

        {/* Schedule & ticket types */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <button
            onClick={() => setScheduleOpen((o) => !o)}
            className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-stone-50"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-amber-700" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Lịch diễn
              </span>
            </div>
            <ChevronDown
              className={`size-4 text-stone-300 transition-transform duration-200 ${scheduleOpen ? "rotate-180" : ""}`}
            />
          </button>

          {scheduleOpen && (
            <>
              <div className="flex items-center justify-between border-t border-stone-100 px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {formatTime(event.startAt)} – {formatTime(event.endAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">{formatDate(event.startAt)}</p>
                </div>
                <Button
                  onClick={handleBuy}
                  disabled={!hasAvailableTickets}
                  className="h-8 rounded-lg bg-amber-700 px-4 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  Mua vé ngay
                </Button>
              </div>

              {event.ticketTypes.length > 0 && (
                <div className="border-t border-stone-100 px-6 pb-5 pt-4">
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                    Thông tin vé
                  </p>
                  <div className="overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
                    {event.ticketTypes.map((tt) => (
                      <TicketRow key={tt.id} tt={tt} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Organizer */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-amber-700">
            Ban tổ chức
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 border border-amber-100">
              {event.organizerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveImageUrl(event.organizerLogoUrl) ?? ""}
                  alt={event.organizerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-amber-700">
                  {getInitials(event.organizerName)}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-stone-900">{event.organizerName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                <User className="size-3" />
                Ban tổ chức sự kiện
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
