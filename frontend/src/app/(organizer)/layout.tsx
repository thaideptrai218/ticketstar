"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarPlus, LayoutDashboard, List, Wallet, X, TriangleAlert } from "lucide-react";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";
import { OrganizerTopNav } from "@/components/layout/organizer-topnav";
import { OrganizerRoute } from "@/components/auth/organizer-route";

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/organizer/dashboard", icon: LayoutDashboard },
  { label: "Sự kiện của tôi", href: "/organizer/events", icon: List },
  { label: "Tạo sự kiện", href: "/organizer/events/new", icon: CalendarPlus },
  { label: "Tổ chức", href: "/organizer/profile", icon: Building2 },
  { label: "Thanh toán", href: "/organizer/payout", icon: Wallet },
];

const NOTICE_ITEMS = [
  "Vui lòng không hiển thị thông tin liên lạc của Ban Tổ Chức (ví dụ: Số điện thoại/ Email/ Website/ Facebook/ Instagram…) trên banner và trong nội dung bài đăng. Chỉ sử dụng duy nhất Hotline TicketStar - 1900.6408.",
  "Trong trường hợp Ban tổ chức tạo mới hoặc cập nhật sự kiện không đúng theo quy định nêu trên, TicketStar có quyền từ chối phê duyệt sự kiện.",
  "TicketStar sẽ liên tục kiểm tra thông tin các sự kiện đang được hiển thị trên nền tảng, nếu phát hiện có sai phạm liên quan đến hình ảnh/ nội dung bài đăng, TicketStar có quyền gỡ bỏ hoặc từ chối cung cấp dịch vụ đối với các sự kiện này, dựa theo điều khoản 2.9 trong Hợp đồng dịch vụ.",
];

function OrganizerNoticeModal({ onClose }: { onClose: () => void }) {
  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border-b border-amber-200">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 shrink-0">
            <TriangleAlert className="size-5 text-amber-700" aria-hidden="true" />
          </div>
          <h2 className="font-semibold text-amber-900 text-base">LƯU Ý KHI ĐĂNG TẢI SỰ KIỆN</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="ml-auto flex size-7 items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <ol className="space-y-3 list-none">
            {NOTICE_ITEMS.map((text, i) => (
              <li key={i} className="flex gap-3 text-sm text-stone-700 leading-relaxed">
                <span className="flex size-5 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            Tôi đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  // Show only once per browser session — use useEffect to avoid SSR/client hydration mismatch
  const [noticeOpen, setNoticeOpen] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem("organizer-notice-seen")) {
      setNoticeOpen(true);
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <AppSidebar navItems={NAV_ITEMS} title="Quản lý" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <OrganizerTopNav />
        {/* OrganizerRoute only guards main content — sidebar/topnav always render to avoid layout flash */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <OrganizerRoute>{children}</OrganizerRoute>
        </main>
      </div>

      {noticeOpen && (
        <OrganizerNoticeModal onClose={() => {
          sessionStorage.setItem("organizer-notice-seen", "1");
          setNoticeOpen(false);
        }} />
      )}
    </div>
  );
}
