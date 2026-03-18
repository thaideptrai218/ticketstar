"use client";

// Staff posts page — view event posts
import { FileText } from "lucide-react";

export default function StaffPostsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100">
          <FileText className="size-5 text-blue-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">Bài đăng</h2>
          <p className="text-sm text-stone-500">Danh sách bài đăng sự kiện</p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-stone-400 text-center py-8">Chưa có bài đăng nào.</p>
      </div>
    </div>
  );
}
