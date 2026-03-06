import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f5] px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-50">
          <ShieldX className="size-8 text-red-500" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-900">Không có quyền truy cập</h1>
          <p className="text-sm text-stone-500">
            Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="rounded-lg border-stone-300">
            <Link href="/">Về trang chủ</Link>
          </Button>
          <Button asChild className="rounded-lg bg-amber-800 hover:bg-amber-900">
            <Link href="/login">Đăng nhập tài khoản khác</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
