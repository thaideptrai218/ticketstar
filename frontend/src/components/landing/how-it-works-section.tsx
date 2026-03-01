"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";
import {
  EventCreationMockup,
  BrowseEventsMockup,
  SelectSeatMockup,
  PaymentMockup,
  ReceiveTicketMockup,
  CheckInMockup,
} from "./step-mockup-illustrations";

const steps = [
  {
    number: "01",
    title: "Tạo sự kiện",
    desc: "Nhà tổ chức thiết lập thông tin sự kiện, cấu hình loại vé, mức giá và địa điểm chỉ trong vài phút.",
    mockup: <EventCreationMockup />,
  },
  {
    number: "02",
    title: "Khám phá sự kiện",
    desc: "Người tham dự tìm kiếm và duyệt sự kiện theo danh mục, địa điểm và thời gian phù hợp.",
    mockup: <BrowseEventsMockup />,
  },
  {
    number: "03",
    title: "Chọn ghế & vé",
    desc: "Xem sơ đồ chỗ ngồi, chọn khu vực và ghế yêu thích, thêm vào giỏ hàng.",
    mockup: <SelectSeatMockup />,
  },
  {
    number: "04",
    title: "Thanh toán",
    desc: "Thanh toán nhanh chóng và an toàn qua VietQR — quét mã bằng ứng dụng ngân hàng.",
    mockup: <PaymentMockup />,
  },
  {
    number: "05",
    title: "Nhận vé QR",
    desc: "Nhận vé điện tử với mã QR ngay sau khi thanh toán thành công. Lưu và quản lý vé trên ứng dụng.",
    mockup: <ReceiveTicketMockup />,
  },
  {
    number: "06",
    title: "Quét & Vào",
    desc: "Nhân viên quét mã QR để xác thực vé tại cửa với theo dõi lượt tham dự theo thời gian thực.",
    mockup: <CheckInMockup />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <ScrollReveal>
          <div className="mb-20 text-center">
            <p className="text-sm font-semibold tracking-widest text-amber-700 uppercase">
              Cách hoạt động
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Hành trình từ tạo sự kiện đến check-in
            </h2>
          </div>
        </ScrollReveal>

        <div className="space-y-20 md:space-y-28">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 0.1}>
              <div
                className={`flex flex-col items-center gap-10 md:flex-row md:gap-16 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-1 text-center md:text-left">
                  <motion.span
                    className="text-7xl font-bold text-stone-200"
                    style={{ fontFamily: "var(--font-display)" }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {step.number}
                  </motion.span>
                  <h3 className="mt-3 text-2xl font-semibold text-stone-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
                    {step.desc}
                  </p>
                </div>

                <motion.div
                  className="shrink-0"
                  initial={{ opacity: 0, x: i % 2 === 0 ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  {step.mockup}
                </motion.div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
