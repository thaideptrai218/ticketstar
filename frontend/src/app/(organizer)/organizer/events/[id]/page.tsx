"use client";

// Event detail page — overview, share link, collaborator invite
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Globe,
  MapPin,
  Pencil,
  FileText,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CollaboratorInviteDialog } from "@/components/organizer/collaborator-invite-dialog";
import { CollaboratorTable } from "@/components/organizer/collaborator-table";
import { useEventCollaborators } from "@/hooks/use-collaborators";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format-utils";
import type { OrganizerEvent } from "@/types/organizer";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  Published: { label: "Đang bán", class: "bg-green-100 text-green-700 border-green-200" },
  Draft: { label: "Nháp", class: "bg-stone-100 text-stone-600 border-stone-200" },
  Cancelled: { label: "Đã hủy", class: "bg-red-100 text-red-600 border-red-200" },
  PendingApproval: { label: "Chờ duyệt", class: "bg-amber-100 text-amber-700 border-amber-200" },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-400">{label}</p>
        <p className="font-semibold text-stone-900 text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Share link card ──────────────────────────────────────────────────────────

function ShareLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${slug}`
    : `/events/${slug}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
          <Globe className="size-4 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-stone-900 text-sm">Chia sẻ sự kiện</h2>
          <p className="text-xs text-stone-400">Link công khai cho người xem và mua vé</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600 truncate font-mono">
          {publicUrl}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0 gap-1.5 cursor-pointer"
        >
          {copied ? (
            <><CheckCircle2 className="size-3.5 text-green-600" /> Đã sao chép</>
          ) : (
            <><ClipboardCopy className="size-3.5" /> Sao chép</>
          )}
        </Button>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

// ─── Collaborators card ───────────────────────────────────────────────────────

function CollaboratorsCard({ eventId }: { eventId: string }) {
  const { data: collaborators, isLoading } = useEventCollaborators(eventId);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50">
            <Users className="size-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-900 text-sm">Cộng tác viên</h2>
            <p className="text-xs text-stone-400">Mời người dùng làm staff cho sự kiện này</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild className="text-xs gap-1.5">
            <Link href={`/organizer/events/${eventId}/staff`}>
              <Users className="size-3.5" />
              Quản lý
            </Link>
          </Button>
          <CollaboratorInviteDialog eventId={eventId} />
        </div>
      </div>

      {/* Permission legend */}
      <div className="flex flex-wrap gap-2">
        {[
          { level: "Viewer", desc: "Xem thống kê", color: "bg-stone-100 text-stone-600" },
          { level: "Operator", desc: "Check-in vé", color: "bg-blue-50 text-blue-700" },
          { level: "Manager", desc: "Đầy đủ quyền", color: "bg-amber-50 text-amber-700" },
        ].map((p) => (
          <span key={p.level} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${p.color}`}>
            {p.level} — {p.desc}
          </span>
        ))}
      </div>

      {/* Collaborator table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      ) : (collaborators?.length ?? 0) === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">Chưa có cộng tác viên nào.</p>
      ) : (
        <CollaboratorTable eventId={eventId} collaborators={collaborators ?? []} />
      )}
    </div>
  );
}

// ─── Quick nav ────────────────────────────────────────────────────────────────

function QuickNav({ eventId }: { eventId: string }) {
  const links = [
    { href: `/organizer/events/${eventId}/edit`, label: "Chỉnh sửa sự kiện", icon: <Pencil className="size-4" /> },
    { href: `/organizer/events/${eventId}/ticket-types`, label: "Loại vé", icon: <Ticket className="size-4" /> },
    { href: `/organizer/events/${eventId}/orders`, label: "Đơn hàng", icon: <ClipboardCopy className="size-4" /> },
    { href: `/organizer/events/${eventId}/checkin`, label: "Check-in", icon: <CheckCircle2 className="size-4" /> },
    { href: `/organizer/events/${eventId}/posts`, label: "Bài đăng", icon: <FileText className="size-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-4 text-xs font-medium text-stone-600 transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
        >
          {l.icon}
          {l.label}
        </Link>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try owned events first, fall back to direct lookup (for collaborator events)
    apiFetch<OrganizerEvent[]>("/api/events/organizer/my-events")
      .then(async (events) => {
        const found = events.find((e) => e.id === id);
        if (found) return found;
        // Not an owned event — fetch the public detail and map to OrganizerEvent shape
        type DetailResponse = {
          id: string; slug: string; title: string; description: string | null;
          startAt: string; endAt: string; venue: string | null; category: string | null;
          imageUrl: string | null; bannerImageUrl: string | null; isOnline: boolean; status: string;
        };
        return apiFetch<DetailResponse>(`/api/events/${id}`)
          .then((d): OrganizerEvent => ({
            id: d.id, slug: d.slug, title: d.title, description: d.description,
            startAt: d.startAt, endAt: d.endAt, venue: d.venue, category: d.category,
            imageUrl: d.imageUrl, bannerImageUrl: d.bannerImageUrl, isOnline: d.isOnline,
            status: d.status, totalTicketCount: 0, availableTicketCount: 0, minPrice: 0,
          }))
          .catch(() => null);
      })
      .then((e) => setEvent(e ?? null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
        <p className="text-stone-500">Không tìm thấy sự kiện.</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/organizer/events">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const st = STATUS_MAP[event.status] ?? STATUS_MAP.Draft;
  const sold = event.totalTicketCount - event.availableTicketCount;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb + header ── */}
      <div>
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          Sự kiện của tôi
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={`${st.class} border text-xs`}>{st.label}</Badge>
              {event.isOnline && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 border text-xs">Online</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-stone-900 truncate">{event.title}</h1>
          </div>
          <Button size="sm" asChild className="shrink-0 gap-2 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer">
            <Link href={`/organizer/events/${id}/edit`}>
              <Pencil className="size-3.5" />
              Chỉnh sửa
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<CalendarDays className="size-4" />} label="Bắt đầu" value={formatDate(event.startAt)} />
        <StatCard icon={<CalendarDays className="size-4" />} label="Kết thúc" value={formatDate(event.endAt)} />
        <StatCard icon={<MapPin className="size-4" />} label="Địa điểm" value={event.isOnline ? "Online" : (event.venue ?? "—")} />
        <StatCard icon={<Ticket className="size-4" />} label="Vé đã bán" value={`${sold} / ${event.totalTicketCount}`} />
      </div>

      {/* ── Quick nav ── */}
      <QuickNav eventId={id} />

      {/* ── Share link ── */}
      <ShareLinkCard slug={event.slug} />

      {/* ── Collaborators ── */}
      <CollaboratorsCard eventId={id} />
    </div>
  );
}
