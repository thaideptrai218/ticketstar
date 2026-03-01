import Link from "next/link";
import { Ticket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerLinks = {
  "Sản phẩm": ["Tính năng", "Bảng giá", "Tích hợp", "Cập nhật"],
  "Công ty": ["Giới thiệu", "Blog", "Tuyển dụng", "Liên hệ"],
  "Pháp lý": ["Quyền riêng tư", "Điều khoản", "Bảo mật"],
};

export function FooterSection() {
  return (
    <footer>
      {/* CTA Banner */}
      <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
        <h2
          className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sẵn sàng tổ chức sự kiện tiếp theo?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-stone-500">
          Tham gia cùng các nhà tổ chức tin tưởng TicketStar để mang đến những
          trải nghiệm khó quên.
        </p>
        <Button
          size="lg"
          className="mt-8 bg-amber-700 text-white hover:bg-amber-800"
        >
          Bắt đầu miễn phí
          <ArrowRight />
        </Button>
      </div>

      {/* Links */}
      <div className="border-t border-stone-200/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 md:flex-row md:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-amber-700 text-white">
                <Ticket className="size-3.5" />
              </div>
              <span
                className="font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                TicketStar
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-500">
              Nền tảng bán vé sự kiện toàn diện dành cho nhà tổ chức tại Việt
              Nam.
            </p>
          </div>

          <div className="flex gap-16">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <p className="text-sm font-semibold text-stone-900">
                  {category}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="text-sm text-stone-500 transition-colors hover:text-stone-900"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-stone-200/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
            <p className="text-xs text-stone-400">
              &copy; 2026 TicketStar. Bảo lưu mọi quyền.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
