"use client";

// Organizer events list — card grid with filter tabs, publish toggle, first-visit notice popup
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, AlertCircle, CalendarDays, MapPin, Ticket, ChevronRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDate, resolveImageUrl } from "@/lib/format-utils";
import { useMyCollaborations } from "@/hooks/use-collaborators";
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

const PERMISSION_LABELS: Record<string, string> = {
  Viewer: "Xem",
  Operator: "Vận hành",
  Manager: "Quản lý",
};

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: allCollaborations } = useMyCollaborations();
  // Only show events where user is an accepted collaborator
  const collaboratedEvents = (allCollaborations ?? []).filter((c) => c.collaboratorStatus === "Accepted");
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

  return (
    <>
      {showNotice && <FirstVisitNotice onClose={handleCloseNotice} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-stone-900">Sự kiện của tôi</h1>
          <Button size="sm" asChild className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shrink-0">
            <Link href="/organizer/events/new">
              <Plus className="size-4" />
              Tạo sự kiện
            </Link>
          </Button>
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
                className={`relative px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none cursor-pointer
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

        {/* Card grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="h-5 w-24 rounded-full bg-stone-100" />
                  <div className="h-5 w-16 rounded-full bg-stone-100" />
                </div>
                <div className="h-5 w-3/4 rounded bg-stone-100" />
                <div className="space-y-2">
                  <div className="h-3.5 w-full rounded bg-stone-100" />
                  <div className="h-3.5 w-2/3 rounded bg-stone-100" />
                </div>
                <div className="flex gap-2 pt-1">
                  <div className="h-7 flex-1 rounded-lg bg-stone-100" />
                  <div className="h-7 flex-1 rounded-lg bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-stone-100 mb-3">
              <CalendarDays className="size-6 text-stone-400" />
            </div>
            <p className="font-medium text-stone-600 text-sm">Chưa có sự kiện nào</p>
            <p className="text-xs text-stone-400 mt-1 mb-4">Nhấn "Tạo sự kiện" để bắt đầu</p>
            <Button size="sm" asChild className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
              <Link href="/organizer/events/new"><Plus className="size-3.5" />Tạo sự kiện</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => {
              const st = STATUS_MAP[e.status] ?? STATUS_MAP.Draft;
              const sold = e.totalTicketCount - e.availableTicketCount;
              return (
                <div key={e.id} className="group relative flex flex-col rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-stone-300">
                  {/* Banner / color strip */}
                  {e.imageUrl ? (
                    <img src={resolveImageUrl(e.imageUrl) ?? ""} alt="" className="h-32 w-full rounded-t-2xl object-cover" />
                  ) : (
                    <div className="h-2 w-full rounded-t-2xl bg-gradient-to-r from-amber-400 to-amber-200" />
                  )}

                  {/* Card body — clickable to detail */}
                  <Link href={`/organizer/events/${e.id}`} className="flex-1 flex flex-col p-5 gap-3 cursor-pointer">
                    {/* Status + online badge */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`${st.class} border text-xs`}>{st.label}</Badge>
                      {e.isOnline && <span className="text-xs text-blue-600 font-medium">Online</span>}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-stone-900 leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
                      {e.title}
                    </h3>

                    {/* Meta */}
                    <div className="space-y-1.5 text-xs text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0" />
                        {formatDate(e.startAt)}
                      </div>
                      {e.venue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{e.venue}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Ticket className="size-3.5 shrink-0" />
                        {sold}/{e.totalTicketCount} vé đã bán
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-auto">
                      <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${e.totalTicketCount > 0 ? (sold / e.totalTicketCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </Link>

                  {/* Action footer */}
                  <div className="flex items-center gap-1 border-t border-stone-100 px-4 py-2.5">
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                      disabled={toggling === e.id}
                      onClick={() => togglePublish(e.id, e.status === "Published")}
                    >
                      {e.status === "Published" ? "Ẩn" : "Đăng"}
                    </Button>
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild className="text-xs text-stone-500 hover:text-stone-800">
                        <Link href={`/organizer/events/${e.id}/edit`}>Sửa</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="text-xs text-stone-500 hover:text-stone-800">
                        <Link href={`/organizer/events/${e.id}/orders`}>Đơn</Link>
                      </Button>
                      <Link href={`/organizer/events/${e.id}`} className="flex size-7 items-center justify-center rounded-lg text-stone-300 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer">
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Collaborated events — events the user has been accepted as a collaborator on */}
        {collaboratedEvents.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-stone-400" />
              <h2 className="text-base font-semibold text-stone-700">Sự kiện cộng tác</h2>
              <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">{collaboratedEvents.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collaboratedEvents.map((c) => (
                <Link
                  key={c.eventId}
                  href={`/organizer/events/${c.eventId}`}
                  className="group relative flex flex-col rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-stone-300"
                >
                  {c.imageUrl ? (
                    <img src={resolveImageUrl(c.imageUrl) ?? ""} alt="" className="h-32 w-full rounded-t-2xl object-cover" />
                  ) : (
                    <div className="h-2 w-full rounded-t-2xl bg-gradient-to-r from-blue-400 to-blue-200" />
                  )}
                  <div className="flex-1 flex flex-col p-5 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">
                        {PERMISSION_LABELS[c.permissionLevel] ?? c.permissionLevel}
                      </Badge>
                      <span className="text-xs text-stone-400">Cộng tác</span>
                    </div>
                    <h3 className="font-semibold text-stone-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                      {c.title}
                    </h3>
                    <div className="space-y-1.5 text-xs text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0" />
                        {formatDate(c.startAt)}
                      </div>
                      {c.venue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{c.venue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end border-t border-stone-100 px-4 py-2.5">
                    <ChevronRight className="size-4 text-stone-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
