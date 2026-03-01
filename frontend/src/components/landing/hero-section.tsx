"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroFlipCard } from "./hero-flip-card";
import { ScrollReveal } from "./scroll-reveal";

const cards = [
  {
    event: "Sunset Music Festival",
    date: "15 Tháng 3, 2026 · 19:00",
    venue: "Landmark 81, TP. Hồ Chí Minh",
    section: "A",
    row: "12",
    seat: "24",
    id: "#TSF-2026-0142",
    description:
      "Đêm nhạc ngoài trời với line-up nghệ sĩ hàng đầu Việt Nam. Trải nghiệm âm nhạc, ẩm thực và nghệ thuật.",
    price: "500.000đ",
  },
  {
    event: "Vietnam Tech Summit",
    date: "20 Tháng 4, 2026 · 08:30",
    venue: "SECC, Quận 7, TP. HCM",
    section: "B",
    row: "5",
    seat: "15",
    id: "#VTS-2026-0089",
    description:
      "Hội nghị công nghệ lớn nhất năm với 50+ diễn giả quốc tế. AI, Web3, Cloud và hơn thế nữa.",
    price: "1.200.000đ",
  },
  {
    event: "Đêm nhạc Trịnh",
    date: "1 Tháng 5, 2026 · 20:00",
    venue: "Nhà hát Lớn, Hà Nội",
    section: "C",
    row: "3",
    seat: "8",
    id: "#DNT-2026-0215",
    description:
      "Đêm nhạc tưởng nhớ nhạc sĩ Trịnh Công Sơn với dàn nghệ sĩ tài năng và dàn nhạc giao hưởng.",
    price: "350.000đ",
  },
];

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <ScrollReveal>
          <div className="mb-6 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Đang thử nghiệm
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h1
            className="text-5xl font-semibold leading-[1.1] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bán vé sự kiện{" "}
            <span className="italic text-amber-700">dễ dàng hơn</span> bao giờ
            hết
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-500">
            Tạo sự kiện, bán vé qua VietQR, và quản lý check-in — tất cả trong
            một nền tảng duy nhất.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              Bắt đầu miễn phí
              <ArrowRight />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Tìm hiểu thêm
            </Button>
          </div>
        </ScrollReveal>
      </div>

      {/* 3 Flip cards in flex layout */}
      <ScrollReveal delay={0.4} className="mt-16 sm:mt-20">
        <div className="flex snap-x snap-mandatory justify-center gap-4 overflow-x-auto px-6 pb-4 sm:snap-none sm:gap-6 sm:overflow-visible">
          {cards.map((card, i) => (
            <HeroFlipCard
              key={card.id}
              data={card}
              className={`snap-center shrink-0 ${
                i === 0
                  ? "sm:-rotate-6"
                  : i === 2
                    ? "sm:rotate-6"
                    : "sm:z-10"
              }`}
            />
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-stone-400">
          Di chuột vào thẻ để xem chi tiết
        </p>
      </ScrollReveal>
    </section>
  );
}
