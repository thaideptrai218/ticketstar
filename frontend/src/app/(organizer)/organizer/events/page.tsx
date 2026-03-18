"use client";

// Organizer events list — horizontal filter tabs, publish toggle, first-visit notice popup
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format-utils";
import type { OrganizerEvent } from "@/types/organizer";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  Published: { label: "Đang bán", class: "bg-green-100 text-green-700" },
  Draft: { label: "Nháp", class: "bg-stone-100 text-stone-600" },
  Cancelled: { label: "Đã hủy", class: "bg-red-100 text-red-600" },
  PendingApproval: { label: "Chờ duyệt", class: "bg-amber-100 text-amber-700" },
};

type FilterTab = "all" | "success" | "processing" | "cancelled";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "success", label: "Thành công" },
  { id: "processing", label: "Đang xử lý" },
  { id: "cancelled", label: "Đã hủy" },
];

const NOTICE_KEY = "organizer_events_notice_seen";

function filterEvents(events: OrganizerEvent[], tab: FilterTab): OrganizerEvent[] {
  switch (tab) {
    case "all":
      return events;
    case "success":
      return events.filter((e) => e.status === "Published");
    case "processing":
      return events.filter((e) => e.status === "Draft" || e.status === "PendingApproval");
    case "cancelled":
      return events.filter((e) => e.status === "Cancelled");
  }
}

function FirstVisitNotice({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 transition-colors"
          aria-label="Đóng"
        >
          <X className="size-5" />
        </button>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 bg-amber-100 rounded-full p-2">
            <AlertCircle className="size-5 text-amber-600" />
          </div>
          <h2 className="text-base font-bold text-stone-900 leading-tight pt-1">
            LƯU Ý KHI ĐĂNG TẢI SỰ KIỆN
          </h2>
        </div>
        <ol className="space-y-3 text-sm text-stone-700 list-none pl-0">
          <li className="flex gap-2.5">
            <span className="flex-shrink-0 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">1</span>
            <span>Vui lòng không hiển thị thông tin liên lạc của Ban Tổ Chức (ví dụ: Số điện thoại/ Email/ Website/ Facebook/ Instagram…) trên banner và trong nội dung bài đăng. Chỉ sử dụng duy nhất Hotline Ticketbox - <strong>1900.6408</strong>.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex-shrink-0 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">2</span>
            <span>Trong trường hợp Ban tổ chức tạo mới hoặc cập nhật sự kiện không đúng theo quy định nêu trên, Ticketbox có quyền từ chối phê duyệt sự kiện.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex-shrink-0 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5">3</span>
            <span>Ticketbox sẽ liên tục kiểm tra thông tin các sự kiện đang được hiển thị trên nền tảng, nếu phát hiện có sai phạm liên quan đến hình ảnh/ nội dung bài đăng, Ticketbox có quyền gỡ bỏ hoặc từ chối cung cấp dịch vụ đối với các sự kiện này, dựa theo điều khoản 2.9 trong Hợp đồng dịch vụ.</span>
          </li>
        </ol>
        <div className="mt-5 flex justify-end">
          <Button onClick={onClose} className="bg-amber-500 hover:bg-amber-600 text-white px-6">
            Đã hiểu
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showNotice, setShowNotice] = useState(false);

  // Show notice only on first visit (persisted in localStorage)
  useEffect(() => {
    if (!localStorage.getItem(NOTICE_KEY)) {
      setShowNotice(true);
    }
  }, []);

  function handleCloseNotice() {
    localStorage.setItem(NOTICE_KEY, "1");
    setShowNotice(false);
  }

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      setEvents(await apiFetch<OrganizerEvent[]>("/api/events/organizer/my-events"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function togglePublish(id: string, isPublished: boolean) {
    setToggling(id);
    try {
      await apiFetch(`/api/events/${id}/${isPublished ? "unpublish" : "publish"}`, { method: "POST" });
      await fetchEvents();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Lỗi khi thay đổi trạng thái");
    } finally {
      setToggling(null);
    }
  }

  const filtered = filterEvents(events, activeTab);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
  }

  return (
    <>
      {showNotice && <FirstVisitNotice onClose={handleCloseNotice} />}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Sự kiện của tôi</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 border-b border-stone-200">
          {TABS.map((tab) => {
            const count = filterEvents(events, tab.id).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none
                  ${isActive
                    ? "text-amber-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-500"
                    : "text-stone-500 hover:text-stone-800"
                  }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-stone-400 py-12 text-center">Chưa có sự kiện nào.</p>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Vé</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const st = STATUS_MAP[e.status] ?? STATUS_MAP.Draft;
                  const sold = e.totalTicketCount - e.availableTicketCount;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                      <TableCell className="text-sm text-stone-500">{formatDate(e.startAt)}</TableCell>
                      <TableCell><Badge className={st.class}>{st.label}</Badge></TableCell>
                      <TableCell className="text-sm">{sold}/{e.totalTicketCount}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" asChild><Link href={`/organizer/events/${e.id}/edit`}>Sửa</Link></Button>
                        <Button variant="outline" size="sm" asChild><Link href={`/organizer/events/${e.id}/ticket-types`}>Loại vé</Link></Button>
                        <Button variant="outline" size="sm" asChild><Link href={`/organizer/events/${e.id}/orders`}>Đơn</Link></Button>
                        <Button
                          variant="ghost" size="sm"
                          disabled={toggling === e.id}
                          onClick={() => togglePublish(e.id, e.status === "Published")}
                        >
                          {e.status === "Published" ? "Ẩn" : "Đăng"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
