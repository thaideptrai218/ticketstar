"use client";

// User profile settings page — avatar upload + personal info form
import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api-client";

const API_URL = "/api/backend";

interface ProfileData {
  fullName: string;
  phone: string;
  avatarUrl: string | null;
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({ fullName: "", phone: "", avatarUrl: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Load profile on mount
  const loadProfile = useCallback(async () => {
    try {
      const data = await apiFetch<{ fullName: string; phone: string | null; avatarUrl: string | null }>(
        "/api/users/me/profile"
      );
      setProfile({ fullName: data.fullName ?? "", phone: data.phone ?? "", avatarUrl: data.avatarUrl ?? null });
      setAvatarPreview(data.avatarUrl ? resolveUrl(data.avatarUrl) : null);
    } catch {
      // Profile endpoint may not exist yet — use JWT claims as fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  function resolveUrl(url: string): string {
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload thất bại");
      const { url } = await res.json();
      setProfile((prev) => ({ ...prev, avatarUrl: url }));
      setAvatarPreview(resolveUrl(url));
      toast.success("Ảnh đại diện đã được cập nhật");
    } catch {
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
      // Revert preview
      setAvatarPreview(profile.avatarUrl ? resolveUrl(profile.avatarUrl) : null);
    } finally {
      setIsUploadingAvatar(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiFetch("/api/users/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone || null,
          avatarUrl: profile.avatarUrl || null,
        }),
      });
      toast.success("Thông tin đã được cập nhật");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  // Derive initials for avatar fallback
  const initials = profile.fullName
    ? profile.fullName.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="size-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Thông tin cá nhân</h2>
        <p className="mt-1 text-sm text-stone-500">
          Cung cấp thông tin chính xác để hỗ trợ quá trình mua vé và xác thực.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          {/* Avatar circle */}
          <div className="size-20 rounded-full overflow-hidden bg-amber-100 ring-2 ring-amber-200">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-amber-700 font-semibold text-xl">
                {initials}
              </div>
            )}
          </div>

          {/* Upload spinner overlay */}
          {isUploadingAvatar && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <Loader2 className="size-5 text-white animate-spin" />
            </div>
          )}

          {/* Camera button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            aria-label="Thay đổi ảnh đại diện"
            className="absolute -bottom-1 -right-1 size-7 rounded-full bg-amber-600 hover:bg-amber-700
              text-white flex items-center justify-center shadow transition-colors disabled:opacity-50"
          >
            <Camera className="size-3.5" aria-hidden="true" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">{profile.fullName || "Chưa đặt tên"}</p>
          <p className="text-xs text-stone-400 mt-0.5">{user?.email}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="mt-2 text-xs text-amber-700 hover:underline disabled:opacity-50"
          >
            Thay đổi ảnh đại diện
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Full name */}
        <div>
          <Label htmlFor="profile-name">Họ và tên</Label>
          <Input
            id="profile-name"
            value={profile.fullName}
            onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))}
            className="mt-1.5"
            placeholder="Nguyễn Văn A"
          />
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="profile-phone">Số điện thoại</Label>
          <div className="flex mt-1.5 gap-2">
            <span className="flex items-center px-3 rounded-md border border-stone-300 bg-stone-50 text-sm text-stone-600 shrink-0">
              +84
            </span>
            <Input
              id="profile-phone"
              type="tel"
              value={profile.phone.replace(/^\+84/, "").replace(/^0/, "")}
              onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
              className="flex-1"
              placeholder="901234567"
            />
          </div>
        </div>

        {/* Email — read-only */}
        <div>
          <Label htmlFor="profile-email">Email</Label>
          <div className="relative mt-1.5">
            <Input
              id="profile-email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="pr-9 bg-stone-50 text-stone-500 cursor-not-allowed"
            />
            {user?.emailVerified && (
              <CheckCircle2
                className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-500"
                aria-label="Email đã xác thực"
              />
            )}
          </div>
          <p className="mt-1 text-xs text-stone-400">Email không thể thay đổi sau khi đăng ký.</p>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 min-w-32"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
