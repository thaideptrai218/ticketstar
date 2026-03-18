"use client";

// Reusable organizer profile form — used on become-organizer and settings pages
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizerProfile, CreateOrganizerProfileRequest } from "@/lib/api/organizer-profile-api";

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
    setError(null);
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          <Input id="org-phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0901234567" />
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
