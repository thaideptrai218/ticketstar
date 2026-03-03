"use client";

import { useState } from "react";
import { Calendar, MapPin, TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";
import Image from "next/image";

const categories = [
  { id: "all", label: "Tất cả" },
  { id: "music", label: "Âm nhạc" },
  { id: "sports", label: "Thể thao" },
  { id: "arts", label: "Nghệ thuật" },
  { id: "workshop", label: "Hội thảo" },
];

const events = [
  {
    id: 1,
    title: "Sunset Music Festival 2026",
    category: "music",
    date: "15 Tháng 3, 2026",
    time: "19:00",
    venue: "Landmark 81, TP. Hồ Chí Minh",
    price: "500.000đ",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop",
  },
  {
    id: 2,
    title: "Vietnam Tech Summit",
    category: "workshop",
    date: "20 Tháng 4, 2026",
    time: "08:30",
    venue: "SECC, Quận 7, TP. HCM",
    price: "1.200.000đ",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
  },
  {
    id: 3,
    title: "Đêm nhạc Trịnh Công Sơn",
    category: "music",
    date: "1 Tháng 5, 2026",
    time: "20:00",
    venue: "Nhà hát Lớn, Hà Nội",
    price: "350.000đ",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop",
  },
  {
    id: 4,
    title: "Marathon TP.HCM 2026",
    category: "sports",
    date: "10 Tháng 4, 2026",
    time: "05:00",
    venue: "Công viên 30/4, Q.1",
    price: "250.000đ",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=600&fit=crop",
  },
  {
    id: 5,
    title: "Triển lãm Nghệ thuật Đương đại",
    category: "arts",
    date: "25 Tháng 3, 2026",
    time: "09:00",
    venue: "Bảo tàng Mỹ thuật, Hà Nội",
    price: "150.000đ",
    image: "https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=800&h=600&fit=crop",
  },
  {
    id: 6,
    title: "AI Workshop: Xây dựng Chatbot",
    category: "workshop",
    date: "5 Tháng 4, 2026",
    time: "14:00",
    venue: "Cocoon Space, Quận 3",
    price: "800.000đ",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=600&fit=crop",
  },
];

export function FeaturedEventsSection() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredEvents =
    activeCategory === "all"
      ? events
      : events.filter((event) => event.category === activeCategory);

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

        {/* Category Tabs */}
        <ScrollReveal delay={0.1}>
          <div className="flex justify-center gap-2 mb-10 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  activeCategory === category.id
                    ? "bg-stone-900 text-white shadow-md"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Events Grid */}
        <ScrollReveal delay={0.2}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* Event Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm">
                    <TicketIcon className="size-3.5 text-amber-700" />
                    {event.price}
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
                        {event.date} · {event.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <MapPin className="size-4 shrink-0" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                  >
                    Đặt vé ngay
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* View All Button */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              size="lg"
              className="border-stone-300 text-stone-700 hover:bg-stone-50"
            >
              Xem tất cả sự kiện
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
