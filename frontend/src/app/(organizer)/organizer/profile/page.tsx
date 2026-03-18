"use client";

// Organizer profile page — Organization Dashboard with card grid layout
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Users,
  X,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMyOrganizerProfiles,
  getCollaboratorOrgs,
  createOrganizerProfile,
  updateOrganizerProfileById,
  type OrganizerProfile,
  type CreateOrganizerProfileRequest,
} from "@/lib/api/organizer-profile-api";
import { OrganizerProfileForm } from "@/components/organizer/organizer-profile-form";
import { useAuth } from "@/contexts/auth-context";

// ─── Org Card ─────────────────────────────────────────────────────────────────

function OrgCard({
  profile,
  isCollaborator,
  onEdit,
}: {
  profile: OrganizerProfile;
  isCollaborator?: boolean;
  onEdit?: () => void;
}) {
  const initial = profile.organizationName?.charAt(0).toUpperCase() ?? "?";
  const joinDate = new Date(profile.createdAt).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="group relative flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-stone-300">
      {/* Top: avatar + badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl font-bold text-amber-700">
          {initial}
        </div>
        {isCollaborator ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Users className="size-3" />
            Cộng tác viên
          </span>
        ) : profile.isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700">
            <ShieldCheck className="size-3" />
            Đã xác minh
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-500">
            <ShieldOff className="size-3" />
            Chưa xác minh
          </span>
        )}
      </div>

      {/* Org name */}
      <h3 className="font-semibold text-stone-900 truncate mb-1">
        {profile.organizationName ?? "Tổ chức"}
      </h3>

      {/* Join date */}
      <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-5">
        <Clock className="size-3 shrink-0" />
        <span>Tham gia {joinDate}</span>
      </div>

      {/* Edit button — owners only */}
      {!isCollaborator && onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="mt-auto w-full gap-2 border-stone-200 text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 cursor-pointer"
        >
          <Pencil className="size-3.5" />
          Chỉnh sửa
        </Button>
      )}
    </div>
  );
}

// ─── Edit Drawer / Panel ───────────────────────────────────────────────────────

function EditPanel({
  profile,
  mode,
  isSaving,
  saved,
  error,
  onSave,
  onClose,
}: {
  profile: OrganizerProfile | null;
  mode: "edit" | "create";
  isSaving: boolean;
  saved: boolean;
  error: string | null;
  onSave: (data: CreateOrganizerProfileRequest) => Promise<void>;
  onClose: () => void;
}) {
  const title = mode === "create" ? "Tổ chức mới" : (profile?.organizationName ?? "Chỉnh sửa");
  const subtitle = mode === "create" ? "Điền thông tin để tạo tổ chức" : "Chỉnh sửa hồ sơ tổ chức";
  const submitLabel = mode === "create" ? "Tạo tổ chức" : "Lưu thay đổi";
  const formKey = mode === "create" ? "__create__" : (profile?.id ?? "none");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      {/* Panel header */}
      <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Building2 className="size-4 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-900 text-sm truncate">{title}</p>
          <p className="text-xs text-stone-400">{subtitle}</p>
        </div>
        {mode === "edit" && profile?.isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 shrink-0">
            <CheckCircle2 className="size-3" />
            Đã xác minh
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Success banner */}
        {saved && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            <CheckCircle2 className="size-4 shrink-0" />
            {mode === "create" ? "Tạo tổ chức thành công!" : "Đã lưu thành công!"}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        <OrganizerProfileForm
          key={formKey}
          defaultValues={mode === "edit" ? (profile ?? undefined) : undefined}
          onSubmit={onSave}
          submitLabel={submitLabel}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="size-12 rounded-xl bg-stone-100" />
        <div className="h-5 w-24 rounded-full bg-stone-100" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 rounded bg-stone-100" />
        <div className="h-3 w-1/2 rounded bg-stone-100" />
      </div>
      <div className="h-8 w-full rounded-lg bg-stone-100" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PanelMode = "edit" | "create" | null;

export default function OrganizerProfilePage() {
  const { refreshUser } = useAuth();
  const [profiles, setProfiles] = useState<OrganizerProfile[]>([]);
  const [collaboratorOrgs, setCollaboratorOrgs] = useState<OrganizerProfile[]>([]);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingProfile = profiles.find((p) => p.id === editingId) ?? null;

  useEffect(() => {
    Promise.all([
      getMyOrganizerProfiles(),
      getCollaboratorOrgs().catch(() => [] as OrganizerProfile[]),
    ])
      .then(([owned, joined]) => {
        setProfiles(owned);
        const ownedIds = new Set(owned.map((p) => p.id));
        setCollaboratorOrgs(joined.filter((p) => !ownedIds.has(p.id)));
      })
      .catch(() => setError("Không thể tải thông tin tổ chức."))
      .finally(() => setIsLoading(false));
  }, []);

  function openEdit(id: string) {
    setEditingId(id);
    setPanelMode("edit");
    setSaved(false);
    setError(null);
  }

  function openCreate() {
    setEditingId(null);
    setPanelMode("create");
    setSaved(false);
    setError(null);
  }

  function closePanel() {
    setPanelMode(null);
    setSaved(false);
    setError(null);
  }

  async function handleSave(data: CreateOrganizerProfileRequest) {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (panelMode === "create") {
        const created = await createOrganizerProfile(data);
        await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        await refreshUser();
        setProfiles((prev) => [...prev, created]);
        setEditingId(created.id);
        setPanelMode("edit");
      } else if (editingProfile) {
        const updated = await updateOrganizerProfileById(editingProfile.id, data);
        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(
        panelMode === "create"
          ? "Tạo tổ chức thất bại. Vui lòng thử lại."
          : "Lưu thất bại. Vui lòng thử lại."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const totalOrgs = profiles.length + collaboratorOrgs.length;

  return (
    <div className="space-y-8">
      {/* ── Owned organizations ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Sở hữu</h2>

        {/* Loading state */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Empty owned */}
        {!isLoading && profiles.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 py-12 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-stone-100 mb-3">
              <Building2 className="size-6 text-stone-400" />
            </div>
            <p className="font-medium text-stone-600 text-sm">Chưa có tổ chức nào</p>
            <p className="text-xs text-stone-400 mt-1 mb-4">Nhấn "Tạo tổ chức mới" để bắt đầu</p>
            <Button
              size="sm"
              onClick={openCreate}
              className="gap-2 bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Tạo tổ chức mới
            </Button>
          </div>
        )}

        {/* Owned org grid */}
        {!isLoading && profiles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <OrgCard
                key={p.id}
                profile={p}
                onEdit={() => openEdit(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tổ chức của tôi</h1>
          <p className="text-sm text-stone-500 mt-1">
            {isLoading
              ? "Đang tải..."
              : totalOrgs > 0
              ? `${totalOrgs} tổ chức · ${profiles.length} sở hữu · ${collaboratorOrgs.length} cộng tác`
              : "Bạn chưa có tổ chức nào."}
          </p>
        </div>
        <Button
          onClick={openCreate}
          size="sm"
          className="shrink-0 gap-2 bg-amber-500 text-white hover:bg-amber-600 shadow-sm cursor-pointer"
        >
          <Plus className="size-4" />
          Tạo tổ chức mới
        </Button>
      </div>

      {/* ── Global load error ── */}
      {!isLoading && error && !panelMode && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Edit / Create panel ── */}
      {panelMode && (
        <EditPanel
          profile={editingProfile}
          mode={panelMode}
          isSaving={isSaving}
          saved={saved}
          error={error}
          onSave={handleSave}
          onClose={closePanel}
        />
      )}

      {/* ── Collaborator organizations ── */}
      {!isLoading && collaboratorOrgs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Đã tham gia
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collaboratorOrgs.map((org) => (
              <OrgCard key={org.id} profile={org} isCollaborator />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
