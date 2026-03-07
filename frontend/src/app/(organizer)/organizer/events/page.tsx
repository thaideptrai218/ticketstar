"use client";

// Organizer events list — table with status, actions (edit, publish/unpublish)
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
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
};

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

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

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Sự kiện của tôi</h1>
        <Button asChild className="bg-amber-600 hover:bg-amber-700">
          <Link href="/organizer/events/new"><PlusCircle className="size-4 mr-1.5" />Tạo sự kiện</Link>
        </Button>
      </div>

      {events.length === 0 ? (
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
              {events.map((e) => {
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
  );
}
