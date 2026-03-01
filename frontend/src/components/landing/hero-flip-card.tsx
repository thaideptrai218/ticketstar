"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

interface CardData {
  event: string;
  date: string;
  venue: string;
  section: string;
  row: string;
  seat: string;
  id: string;
  description: string;
  price: string;
}

const QR = [
  1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0,
  1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1,
];

export function HeroFlipCard({
  data,
  className,
}: {
  data: CardData;
  className?: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isFlipped) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: y * -6, y: x * 6 });
    },
    [isFlipped],
  );

  return (
    <div
      className={`cursor-pointer select-none [perspective:1000px] ${className ?? ""}`}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setIsFlipped(false); setTilt({ x: 0, y: 0 }); }}
    >
      <motion.div
        animate={{
          rotateY: isFlipped ? 180 : tilt.y,
          rotateX: isFlipped ? 0 : tilt.x,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        style={{ transformStyle: "preserve-3d" }}
        className="grid w-60 sm:w-72"
      >
        {/* Front */}
        <div
          className="col-start-1 row-start-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-amber-700 uppercase">
              TicketStar
            </span>
            <span className="font-mono text-[10px] text-stone-400">
              {data.id}
            </span>
          </div>
          <h4 className="text-base font-semibold text-stone-900">
            {data.event}
          </h4>
          <p className="mt-1 text-xs text-stone-500">{data.date}</p>
          <p className="text-xs text-stone-500">{data.venue}</p>
          <div className="my-4 border-t border-dashed border-stone-200" />
          <div className="flex items-end justify-between">
            <div className="flex gap-5">
              {[
                ["Khu vực", data.section],
                ["Hàng", data.row],
                ["Ghế", data.seat],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] font-medium tracking-wider text-stone-400 uppercase">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-stone-700">{val}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {QR.map((c, i) => (
                <div
                  key={i}
                  className={`size-1.5 rounded-[1px] ${c ? "bg-stone-700" : "bg-transparent"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="col-start-1 row-start-1 flex flex-col justify-between rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <span className="text-xs font-semibold tracking-widest text-amber-700 uppercase">
              Chi tiết
            </span>
            <h4 className="mt-2 text-base font-semibold text-stone-900">
              {data.event}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              {data.description}
            </p>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-stone-900">
                {data.price}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Còn vé
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-amber-700 py-2.5 text-center text-sm font-medium text-white">
              Mua vé &rarr;
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
