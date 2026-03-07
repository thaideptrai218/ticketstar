"use client";

// Become Organizer page — lets any authenticated user enable organizer mode.
// Calls POST /api/account/become-organizer, then redirects to organizer dashboard.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle, DollarSign, TicketIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";

const FEATURES = [
  { icon: CalendarPlus, title: "Tạo sự kiện dễ dàng", desc: "Thiết lập sự kiện, loại vé và giá trong vài phút." },
  { icon: TicketIcon, title: "Quản lý vé", desc: "Theo dõi doanh số, check-in bằng QR code." },
  { icon: Users, title: "Quản lý nhân viên", desc: "Phân quyền nhân viên quét vé cho từng sự kiện." },
  { icon: DollarSign, title: "Theo dõi doanh thu", desc: "Xem báo cáo doanh thu và thanh toán chi tiết." },
];

export default function BecomeOrganizerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBecomeOrganizer() {
    setIsLoading(true);
    setError(null);
    try {
      await apiFetch("/api/account/become-organizer", { method: "POST" });
      // Redirect to organizer dashboard — OrganizerRoute will auto-refresh the token
      // so the new is_organizer claim is picked up before granting access
      router.push("/organizer/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="text-center mb-10">
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-amber-100 mb-4">
          <CalendarPlus className="size-8 text-amber-700" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900">Trở thành Ban tổ chức</h1>
        <p className="mt-3 text-stone-500 text-lg">
          Tạo và quản lý sự kiện của bạn trên TicketStar — miễn phí để bắt đầu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-10">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="shrink-0 flex size-9 items-center justify-center rounded-lg bg-amber-50">
              <Icon className="size-4 text-amber-700" />
            </div>
            <div>
              <p className="font-medium text-stone-900 text-sm">{title}</p>
              <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          className="w-full max-w-sm bg-amber-700 hover:bg-amber-800 text-white"
          onClick={handleBecomeOrganizer}
          disabled={isLoading}
        >
          <CheckCircle className="size-4 mr-2" />
          {isLoading ? "Đang xử lý..." : "Bắt đầu tổ chức sự kiện"}
        </Button>
        <p className="text-xs text-stone-400">
          Bạn vẫn có thể mua vé như một khán giả bình thường.
        </p>
      </div>
    </div>
  );
}
