"use client";

// Collaborator event dashboard — permission-gated sections based on role
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMyCollaborations } from "@/hooks/use-collaborators";
import type { CollaboratorPermissionLevel } from "@/types/organizer";

const PERMISSION_LABELS: Record<string, string> = {
  Viewer: "Xem",
  Operator: "Vận hành",
  Manager: "Quản lý",
};

function hasPermission(level: CollaboratorPermissionLevel, required: CollaboratorPermissionLevel): boolean {
  const order: CollaboratorPermissionLevel[] = ["Viewer", "Operator", "Manager"];
  return order.indexOf(level) >= order.indexOf(required);
}

export default function CollaborateEventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: collaborations, isLoading } = useMyCollaborations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const collaboration = collaborations?.find((c) => c.eventId === eventId);

  if (!collaboration) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
        <p className="text-stone-500">Bạn không có quyền truy cập sự kiện này.</p>
      </div>
    );
  }

  const level = collaboration.permissionLevel;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-stone-900">{collaboration.title}</h1>
        <Badge variant="outline" className="text-xs">
          {PERMISSION_LABELS[level] ?? level}
        </Badge>
      </div>

      {/* Viewer+ — stats */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-base font-semibold text-stone-800 mb-3">Thống kê sự kiện</h2>
        <p className="text-sm text-stone-400">Thống kê vé và doanh thu sẽ hiển thị ở đây.</p>
      </div>

      {/* Operator+ — check-in */}
      {hasPermission(level, "Operator") && (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-3">Check-in vé</h2>
          <p className="text-sm text-stone-400">
            Truy cập trang check-in:{" "}
            <a href={`/organizer/events/${eventId}/checkin`} className="text-amber-700 underline">
              Mở trang quét vé
            </a>
          </p>
        </div>
      )}

      {/* Manager+ — posts/announcements */}
      {hasPermission(level, "Manager") && (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-3">Quản lý bài đăng</h2>
          <p className="text-sm text-stone-400">Tính năng đăng thông báo đang được phát triển.</p>
        </div>
      )}
    </div>
  );
}
