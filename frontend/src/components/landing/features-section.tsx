"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  BarChart3,
  Wallet,
  ClipboardCheck,
  UserCog,
  Search,
  CreditCard,
  Ticket,
  Smartphone,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ScrollReveal, staggerContainer, staggerItem } from "./scroll-reveal";

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  accent: string;
  iconBg: string;
  span?: boolean;
}

const organizerFeatures: Feature[] = [
  {
    icon: Calendar,
    title: "Tạo & quản lý sự kiện",
    desc: "Thiết lập sự kiện với nhiều loại vé, mức giá linh hoạt và hạn mức số lượng. Tùy chỉnh trang sự kiện theo phong cách riêng.",
    accent: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-100 text-amber-700",
    span: true,
  },
  {
    icon: BarChart3,
    title: "Thống kê doanh thu",
    desc: "Theo dõi doanh số bán vé và báo cáo chi tiết theo thời gian thực.",
    accent: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    icon: Wallet,
    title: "Quản lý thanh toán",
    desc: "Nhận thanh toán tự động qua VietQR, đối soát và quản lý luồng tiền.",
    accent: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: ClipboardCheck,
    title: "Theo dõi check-in",
    desc: "Xem lượt check-in theo thời gian thực, thống kê tỷ lệ tham dự.",
    accent: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-100 text-violet-700",
  },
  {
    icon: UserCog,
    title: "Phân công nhân viên",
    desc: "Gán vai trò cho nhân viên check-in, quản lý quyền truy cập theo sự kiện.",
    accent: "from-rose-500 to-pink-500",
    iconBg: "bg-rose-100 text-rose-700",
  },
];

const attendeeFeatures: Feature[] = [
  {
    icon: Search,
    title: "Khám phá sự kiện",
    desc: "Tìm kiếm và duyệt sự kiện theo danh mục, địa điểm và thời gian. Gợi ý sự kiện phù hợp với sở thích của bạn.",
    accent: "from-cyan-500 to-blue-500",
    iconBg: "bg-cyan-100 text-cyan-700",
    span: true,
  },
  {
    icon: CreditCard,
    title: "Mua vé qua VietQR",
    desc: "Thanh toán nhanh chóng bằng quét mã QR qua ứng dụng ngân hàng.",
    accent: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    icon: Ticket,
    title: "Vé QR điện tử",
    desc: "Nhận vé điện tử với mã QR ngay sau khi thanh toán thành công.",
    accent: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: Smartphone,
    title: "Quản lý vé",
    desc: "Xem toàn bộ vé đã mua, lịch sử sự kiện và trạng thái check-in.",
    accent: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-100 text-violet-700",
  },
  {
    icon: Zap,
    title: "Check-in nhanh",
    desc: "Xuất trình mã QR tại cửa để check-in tức thì, không cần in vé giấy.",
    accent: "from-rose-500 to-pink-500",
    iconBg: "bg-rose-100 text-rose-700",
  },
];

const tabs = [
  { key: "organizer" as const, label: "Nhà tổ chức", features: organizerFeatures },
  { key: "attendee" as const, label: "Người tham dự", features: attendeeFeatures },
];

function FeatureCard({ f }: { f: Feature }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-2xl border border-stone-200/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl ${
        f.span ? "sm:col-span-2 sm:flex sm:items-start sm:gap-6" : ""
      }`}
    >
      {/* Gradient top accent bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${f.accent} opacity-0 transition-opacity group-hover:opacity-100`}
      />

      {/* Decorative gradient blob */}
      <div
        className={`absolute -top-12 -right-12 size-32 rounded-full bg-gradient-to-br ${f.accent} opacity-0 blur-3xl transition-opacity group-hover:opacity-[0.07]`}
      />

      <div className={`relative ${f.span ? "shrink-0" : ""}`}>
        <div className={`mb-4 flex size-12 items-center justify-center rounded-2xl ${f.iconBg} sm:mb-0 ${f.span ? "sm:mb-0" : "sm:mb-4"}`}>
          <f.icon className="size-6" />
        </div>
      </div>

      <div className="relative">
        <h3 className="text-base font-semibold text-stone-900">{f.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
          {f.desc}
        </p>
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const [active, setActive] = useState<"organizer" | "attendee">("organizer");
  const current = tabs.find((t) => t.key === active)!;

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold tracking-widest text-amber-700 uppercase">
              Tính năng
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Được thiết kế cho mọi vai trò
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mb-12 flex justify-center">
            <div className="inline-flex rounded-full border border-stone-200 bg-stone-100/60 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActive(tab.key)}
                  className={`relative rounded-full px-6 py-2 text-sm font-medium transition-all ${
                    active === tab.key
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid gap-4 sm:grid-cols-2"
            >
              {current.features.map((f) => (
                <FeatureCard key={f.title} f={f} />
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
