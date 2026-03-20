"use client";

// Reusable organizer profile form — used on become-organizer and settings pages
import { useCallback, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizerProfile, CreateOrganizerProfileRequest } from "@/lib/api/organizer-profile-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5010";
const MAX_SIZE = 5 * 1024 * 1024;

// Compact avatar uploader — shows a 56px circle, click to replace
function AvatarUpload({
  value,
  orgName,
  onChange,
}: {
  value: string | null;
  orgName: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = value ? (value.startsWith("http") ? value : `${API_URL}${value}`) : null;
  const initial = orgName?.charAt(0).toUpperCase() || "?";

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE) { setError("Tệp quá lớn (tối đa 5MB)"); return; }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/files/upload`, { method: "POST", credentials: "include", body: formData });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? "Upload thất bại"); }
      const { url } = await res.json();
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  return (
    <div className="flex items-center gap-4">
      {/* Avatar circle */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`group relative flex size-16 items-center justify-center rounded-full text-xl font-bold text-amber-700 overflow-hidden transition-colors cursor-pointer ${previewUrl ? "border-2 border-stone-200 bg-transparent" : "bg-amber-100 border-2 border-dashed border-amber-300 hover:border-amber-500"}`}
          title="Đổi ảnh đại diện"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
          {/* Hover overlay */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Camera className="size-5 text-white" />
          </span>
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
              <span className="size-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </span>
          )}
        </button>
        {/* Remove button */}
        {previewUrl && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
            title="Xóa ảnh"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {/* Label + hint */}
      <div className="text-sm">
        <p className="font-medium text-stone-700">Ảnh đại diện tổ chức</p>
        <p className="text-xs text-stone-400">200×200 · JPG, PNG, WEBP · tối đa 5MB</p>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
    </div>
  );
}

interface OrganizerProfileFormProps {
  defaultValues?: Partial<OrganizerProfile>;
  onSubmit: (data: CreateOrganizerProfileRequest) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function OrganizerProfileForm({
  defaultValues,
  onSubmit,
  submitLabel = "Lưu",
  isLoading = false,
}: OrganizerProfileFormProps) {
  const [values, setValues] = useState<CreateOrganizerProfileRequest>({
    organizationName: defaultValues?.organizationName ?? "",
    description: defaultValues?.description ?? "",
    phone: defaultValues?.phone ?? "",
    address: defaultValues?.address ?? "",
    website: defaultValues?.website ?? "",
    facebookUrl: defaultValues?.facebookUrl ?? "",
    instagramUrl: defaultValues?.instagramUrl ?? "",
    logoUrl: defaultValues?.logoUrl ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof CreateOrganizerProfileRequest, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values.organizationName.trim()) {
      setError("Tên tổ chức là bắt buộc.");
      return;
    }
    // Phone must be exactly 10 digits if provided
    if (values.phone && !/^\d{10}$/.test(values.phone)) {
      setError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }
    setError(null);
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Logo upload — compact avatar circle */}
      <AvatarUpload
        value={values.logoUrl ?? null}
        orgName={values.organizationName}
        onChange={(url) => set("logoUrl", url)}
      />

      <div className="space-y-1.5">
        <Label htmlFor="org-name">Tên tổ chức <span className="text-red-500">*</span></Label>
        <Input
          id="org-name"
          value={values.organizationName}
          onChange={(e) => set("organizationName", e.target.value)}
          placeholder="Tên ban tổ chức của bạn"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-desc">Mô tả</Label>
        <textarea
          id="org-desc"
          value={values.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("description", e.target.value)}
          placeholder="Giới thiệu về tổ chức của bạn"
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-phone">Số điện thoại</Label>
          <Input
            id="org-phone"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="0901234567"
            maxLength={10}
          />
          <p className="text-xs text-stone-400">Đúng 10 chữ số</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-website">Website</Label>
          <Input id="org-website" value={values.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-address">Địa chỉ</Label>
        <Input id="org-address" value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Địa chỉ tổ chức" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-facebook">Facebook</Label>
          <Input id="org-facebook" value={values.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} placeholder="https://facebook.com/..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-instagram">Instagram</Label>
          <Input id="org-instagram" value={values.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="https://instagram.com/..." />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isLoading} className="bg-amber-700 hover:bg-amber-800 text-white w-full">
        {isLoading ? "Đang xử lý..." : submitLabel}
      </Button>
    </form>
  );
}
