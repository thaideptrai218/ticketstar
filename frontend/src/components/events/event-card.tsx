import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, TicketIcon, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate, formatTime, resolveImageUrl } from "@/lib/format-utils";
import type { EventListItem } from "@/types/events";

interface EventCardProps {
  event: EventListItem;
}

export function EventCard({ event }: EventCardProps) {
  const isSoldOut = event.availableTicketCount === 0;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {resolveImageUrl(event.imageUrl) ? (
          <Image
            src={resolveImageUrl(event.imageUrl)!}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={resolveImageUrl(event.imageUrl)!.includes("localhost")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <TicketIcon className="size-12" />
          </div>
        )}
        {/* Online badge */}
        {event.isOnline && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-blue-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-white shadow-sm">
            Online
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm">
          <TicketIcon className="size-3.5 text-amber-700" />
          {isSoldOut ? "Hết vé" : formatPrice(event.minPrice)}
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        {/* Category + status row */}
        {(event.category || event.status !== "Published") && (
          <div className="mb-2 flex items-center gap-1.5 flex-wrap">
            {event.category && (
              <Badge variant="outline" className="text-xs text-stone-500 border-stone-200 px-2 py-0.5">
                {event.category}
              </Badge>
            )}
            {event.status === "Cancelled" && (
              <Badge className="text-xs bg-red-50 text-red-600 border-red-100 px-2 py-0.5">Đã hủy</Badge>
            )}
            {event.status === "Draft" && (
              <Badge className="text-xs bg-stone-100 text-stone-500 border-stone-200 px-2 py-0.5">Nháp</Badge>
            )}
          </div>
        )}

        <h3 className="text-lg font-semibold text-stone-900 line-clamp-2 group-hover:text-amber-700 transition-colors">
          {event.title}
        </h3>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Calendar className="size-4 shrink-0" />
            <span>
              {formatDate(event.startAt)} · {formatTime(event.startAt)}
              {event.endAt && ` – ${formatTime(event.endAt)}`}
            </span>
          </div>
          {event.venue && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <MapPin className="size-4 shrink-0" />
              <span className="line-clamp-1">{event.venue}</span>
            </div>
          )}
          {!isSoldOut && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Users className="size-4 shrink-0" />
              <span>{event.availableTicketCount} vé còn lại</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="mt-2 text-xs text-stone-400 line-clamp-2 leading-relaxed">
            {event.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
          </p>
        )}

        {/* Ticket availability bar */}
        {event.totalTicketCount > 0 && (
          <div className="mt-3">
            <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isSoldOut ? "bg-red-300" : "bg-amber-400"}`}
                style={{ width: `${Math.round(((event.totalTicketCount - event.availableTicketCount) / event.totalTicketCount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 cursor-pointer"
          asChild
        >
          <span>{isSoldOut ? "Xem chi tiết" : "Đặt vé ngay"}</span>
        </Button>
      </div>
    </Link>
  );
}
