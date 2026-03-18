"use client";

// Organizer settings — edit existing organizer profile
import { ApiError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizerProfileForm } from "@/components/organizer/organizer-profile-form";
import { useOrganizerProfile, useUpdateOrganizerProfile } from "@/hooks/use-organizer-profile";
import { useState } from "react";
import type { CreateOrganizerProfileRequest } from "@/lib/api/organizer-profile-api";

export default function OrganizerSettingsPage() {
  const { data: profile, isLoading } = useOrganizerProfile();
  const { mutateAsync: updateProfile } = useUpdateOrganizerProfile();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(data: CreateOrganizerProfileRequest) {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateProfile(data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật thông tin.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Cài đặt tổ chức</h1>

      {success && (
        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
          Cập nhật thông tin thành công.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <OrganizerProfileForm
          defaultValues={profile}
          onSubmit={handleSubmit}
          submitLabel="Lưu thay đổi"
          isLoading={saving}
        />
      </div>
    </div>
  );
}
