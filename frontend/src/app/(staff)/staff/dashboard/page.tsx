"use client";

// Staff dashboard — overview of assigned events and check-in activity
import { QrCode, FileText, Activity, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

interface QuickLinkCardProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  accent: string;
}

function QuickLinkCard({ href, icon: Icon, label, description, accent }: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-4 translate-x-4 rounded-full opacity-10 ${accent}`} />
      <div className={`flex size-10 items-center justify-center rounded-xl ${accent} bg-opacity-15 mb-4`}>
        <Icon className="size-5 text-stone-700" />
      </div>
      <p className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors">{label}</p>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </Link>
  );
}

export default function StaffDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100">
          <Activity className="size-5 text-amber-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">
            Xin chào{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
          </h2>
          <p className="text-sm text-stone-500">Bảng điều khiển nhân viên</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLinkCard
          href="/staff/checkin"
          icon={QrCode}
          label="Check-in"
          description="Quét mã QR để xác nhận vé"
          accent="bg-emerald-500"
        />
        <QuickLinkCard
          href="/staff/posts"
          icon={FileText}
          label="Bài đăng"
          description="Xem và quản lý bài đăng sự kiện"
          accent="bg-blue-500"
        />
        <QuickLinkCard
          href="/staff/checkin"
          icon={CalendarDays}
          label="Sự kiện hôm nay"
          description="Danh sách sự kiện đang diễn ra"
          accent="bg-amber-500"
        />
      </div>

      {/* Recent activity placeholder */}
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-stone-700 mb-4">Hoạt động gần đây</p>
        <p className="text-sm text-stone-400 text-center py-8">Chưa có dữ liệu hoạt động.</p>
      </div>
    </div>
  );
}
