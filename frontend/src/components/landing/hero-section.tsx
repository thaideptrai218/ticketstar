"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroFlipCard } from "./hero-flip-card";

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

const stats = [
  { value: "10K+", label: "Sự kiện" },
  { value: "500K+", label: "Vé đã bán" },
  { value: "2K+", label: "Nhà tổ chức" },
  { value: "98%", label: "Hài lòng" },
];

// Animated background orbs
function BackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-32 left-1/4 size-[500px] rounded-full bg-amber-200/30 blur-[120px]"
        animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-20 right-1/4 size-[400px] rounded-full bg-orange-200/20 blur-[100px]"
        animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-stone-200/40 blur-[120px]"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}

// Floating particle dots
function FloatingDots() {
  const dots = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: (i * 8.3) % 100,
    y: (i * 13.7) % 100,
    delay: i * 0.4,
    size: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full bg-amber-400/25"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
          }}
          animate={{ y: [0, -16, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{
            duration: 4 + (dot.id % 3),
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
      <BackgroundOrbs />
      <FloatingDots />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700 shadow-sm"
        >
          <Sparkles className="size-3" />
          Nền tảng bán vé #1 Việt Nam
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-5xl font-semibold leading-[1.08] tracking-tight text-stone-900 sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        >
          Bán vé sự kiện{" "}
          <motion.span
            className="relative italic text-amber-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            dễ dàng hơn
            {/* Underline accent */}
            <motion.svg
              viewBox="0 0 280 12"
              className="absolute -bottom-1 left-0 w-full"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            >
              <motion.path
                d="M4 8 C50 4, 130 2, 276 6"
                stroke="#b45309"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
              />
            </motion.svg>
          </motion.span>{" "}
          bao giờ hết
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-stone-500"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Tạo sự kiện, bán vé qua VietQR, và quản lý check-in — tất cả trong một nền tảng duy nhất.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className="mt-9 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            size="lg"
            className="bg-amber-700 text-white hover:bg-amber-800 shadow-lg shadow-amber-200/50 gap-2"
            asChild
          >
            <Link href="/register">
              Bắt đầu miễn phí
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-stone-300 text-stone-700 hover:bg-stone-100"
            asChild
          >
            <Link href="/events">Khám phá sự kiện</Link>
          </Button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.08 }}
            >
              <p
                className="text-2xl font-bold text-stone-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
              </p>
              <p className="text-xs text-stone-400">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Flip cards */}
      <motion.div
        className="mt-16 sm:mt-20"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      >
        <div className="flex snap-x snap-mandatory justify-center gap-4 overflow-x-auto px-6 pb-4 sm:snap-none sm:gap-6 sm:overflow-visible">
          {cards.map((card, i) => (
            <HeroFlipCard
              key={card.id}
              data={card}
              className={`snap-center shrink-0 ${
                i === 0 ? "sm:-rotate-6" : i === 2 ? "sm:rotate-6" : "sm:z-10"
              }`}
            />
          ))}
        </div>
        <motion.p
          className="mt-4 text-center text-xs text-stone-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Di chuột vào thẻ để xem chi tiết
        </motion.p>
      </motion.div>
    </section>
  );
}
