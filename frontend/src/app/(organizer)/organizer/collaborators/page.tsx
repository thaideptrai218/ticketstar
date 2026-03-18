"use client";

// Cross-event collaborations view — shows all events the user collaborates on
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCollaborations } from "@/hooks/use-collaborators";
import { formatDate } from "@/lib/format-utils";

const PERMISSION_LABELS: Record<string, string> = {
  Viewer: "Xem",
  Operator: "Vận hành",
  Manager: "Quản lý",
};

export default function MyCollaborationsPage() {
  const { data: allCollaborations, isLoading } = useMyCollaborations();
  // Only show accepted collaborations here — pending invites are handled by NotificationBell
  const collaborations = (allCollaborations ?? []).filter((c) => c.collaboratorStatus === "Accepted");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Cộng tác viên của tôi</h1>

      {!collaborations || collaborations.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <p className="text-stone-400 text-sm">Bạn chưa tham gia cộng tác sự kiện nào.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collaborations.map((c) => (
            <Link
              key={c.eventId}
              href={`/organizer/events/${c.eventId}/collaborate`}
              className="rounded-xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-stone-900 line-clamp-1">{c.title}</h3>
                <Badge variant="outline" className="text-xs shrink-0">
                  {PERMISSION_LABELS[c.permissionLevel] ?? c.permissionLevel}
                </Badge>
              </div>
              <p className="text-xs text-stone-400 mt-1">{formatDate(c.startAt)}</p>
              {c.venue && <p className="text-xs text-stone-500 mt-0.5">{c.venue}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
