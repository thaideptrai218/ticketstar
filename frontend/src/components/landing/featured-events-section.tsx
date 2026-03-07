"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, TicketIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";
import Image from "next/image";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatPrice, formatTime } from "@/lib/format-utils";
import type { PagedResult } from "@/types/api";
import type { EventListItem } from "@/types/events";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop";

export function FeaturedEventsSection() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PagedResult<EventListItem>>("/api/events?page=1&pageSize=6")
      .then((data) => setEvents(data.items))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu"),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="mb-10 text-center">
            <h2
              className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Khám phá sự kiện
            </h2>
            <p className="mt-3 text-stone-500">
              Tìm kiếm sự kiện phù hợp với sở thích của bạn
            </p>
          </div>
        </ScrollReveal>

        {/* Events Grid */}
        <ScrollReveal delay={0.1}>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-stone-200 bg-stone-100 h-72"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-center text-stone-500">{error}</p>
          ) : events.length === 0 ? (
            <p className="text-center text-stone-500">Chưa có sự kiện nào.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Event Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                    <Image
                      src={event.imageUrl ?? PLACEHOLDER_IMAGE}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm">
                      <TicketIcon className="size-3.5 text-amber-700" />
                      {event.minPrice > 0 ? formatPrice(event.minPrice) : "Miễn phí"}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-stone-900 line-clamp-2 group-hover:text-amber-700 transition-colors">
                      {event.title}
                    </h3>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <Calendar className="size-4 shrink-0" />
                        <span>
                          {formatDate(event.startAt)} · {formatTime(event.startAt)}
                        </span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-2 text-sm text-stone-500">
                          <MapPin className="size-4 shrink-0" />
                          <span className="line-clamp-1">{event.venue}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                      asChild
                    >
                      <Link href={`/events/${event.slug}`}>Đặt vé ngay</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollReveal>

        {/* View All Button */}
        <ScrollReveal delay={0.2}>
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              size="lg"
              className="border-stone-300 text-stone-700 hover:bg-stone-50"
              asChild
            >
              <Link href="/home">Xem tất cả sự kiện</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
