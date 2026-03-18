"use client";

// Step 1: Cover/banner images, host org selector, title, category, location, description
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronDown, PlusCircle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "./image-upload-zone";
import { RichTextEditor } from "./rich-text-editor";
import { fetchProvinces } from "@/lib/vn-provinces";
import { apiFetch } from "@/lib/api-client";
import { getMyOrganizerProfiles, type OrganizerProfile } from "@/lib/api/organizer-profile-api";
import type { WizardState } from "./event-wizard";

const CATEGORIES = ["Âm nhạc", "Thể thao", "Nghệ thuật", "Công nghệ", "Ẩm thực", "Giáo dục", "Khác"];

interface AdminOrgOption {
  id: string;
  userId: string;
  organizationName: string;
}

interface Step1Props {
  data: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  isCreateMode: boolean;
  isAdmin?: boolean;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

// ─── Org Combobox ─────────────────────────────────────────────────────────────

/** Searchable dropdown for selecting an organizer profile */
function OrgCombobox({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: OrganizerProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = profiles.find((p) => p.id === selectedId);

  const filtered = query.trim()
    ? profiles.filter((p) =>
        p.organizationName.toLowerCase().includes(query.toLowerCase())
      )
    : profiles;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleToggle() {
    setOpen((prev) => !prev);
    if (!open) setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center gap-3 rounded-lg border-2 px-4 py-2.5 text-sm transition-all bg-white ${
          open ? "border-amber-500 shadow-sm" : "border-stone-200 hover:border-stone-300"
        }`}
      >
        {selected ? (
          <>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-xs font-bold text-amber-800">
              {selected.organizationName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-stone-800 truncate">{selected.organizationName}</p>
              {selected.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="size-3" />
                  Đã xác minh
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <Building2 className="size-4 shrink-0 text-stone-400" />
            <span className="flex-1 text-left text-stone-400">Chọn ban tổ chức...</span>
          </>
        )}
        <ChevronDown className={`size-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-stone-100 px-3 py-2">
            <Search className="size-3.5 shrink-0 text-stone-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tổ chức..."
              className="flex-1 text-sm outline-none placeholder:text-stone-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-stone-400 hover:text-stone-600">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-stone-400 text-center">Không tìm thấy tổ chức</li>
            ) : (
              filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors ${
                      p.id === selectedId ? "bg-amber-50" : ""
                    }`}
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      p.id === selectedId ? "bg-amber-200 text-amber-800" : "bg-stone-100 text-stone-500"
                    }`}>
                      {p.organizationName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`font-medium truncate ${p.id === selectedId ? "text-amber-900" : "text-stone-800"}`}>
                        {p.organizationName}
                      </p>
                      {p.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="size-3" />
                          Đã xác minh
                        </span>
                      )}
                    </div>
                    {p.id === selectedId && (
                      <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13.5 4.5l-7 7-3-3" />
                      </svg>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Footer: create new */}
          <div className="border-t border-stone-100 p-2">
            <Link
              href="/organizer/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <PlusCircle className="size-4" />
              Tạo tổ chức mới
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

export function Step1EventInfo({ data, onChange, onNext, isCreateMode, isAdmin }: Step1Props) {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [adminOrgs, setAdminOrgs] = useState<AdminOrgOption[]>([]);
  const [myProfiles, setMyProfiles] = useState<OrganizerProfile[]>([]);

  useEffect(() => {
    fetchProvinces().then(setProvinces);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      apiFetch<AdminOrgOption[]>("/api/admin/organizers").then(setAdminOrgs).catch(() => {});
    } else {
      getMyOrganizerProfiles()
        .then((list) => {
          setMyProfiles(list);
          // Auto-select the only profile if none selected yet
          if (!data.organizerProfileId && list.length === 1) {
            onChange({ organizerProfileId: list[0].id });
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function handleTitleChange(title: string) {
    const update: Partial<WizardState> = { title };
    if (isCreateMode) update.slug = toSlug(title);
    onChange(update);
  }

  function validate(): boolean {
    if (!data.title.trim()) return false;
    if (!isAdmin && myProfiles.length > 0 && !data.organizerProfileId) return false;
    return true;
  }

  return (
    <div className="space-y-6">
      {/* Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ImageUploadZone
          label="Ảnh bìa"
          dimensions="720x958"
          value={data.coverImageUrl}
          onChange={(url) => onChange({ coverImageUrl: url })}
        />
        <ImageUploadZone
          label="Ảnh banner"
          dimensions="1280x720"
          value={data.bannerImageUrl}
          onChange={(url) => onChange({ bannerImageUrl: url })}
        />
      </div>

      {/* Non-admin: searchable org combobox */}
      {!isAdmin && myProfiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>
              Nhà tổ chức <span className="text-red-500">*</span>
            </Label>
            {data.organizerProfileId && (
              <Link
                href="/organizer/profile"
                className="text-xs text-amber-600 hover:text-amber-700 hover:underline"
              >
                Chỉnh sửa hồ sơ
              </Link>
            )}
          </div>
          <OrgCombobox
            profiles={myProfiles}
            selectedId={data.organizerProfileId ?? ""}
            onSelect={(id) => onChange({ organizerProfileId: id })}
          />
          {myProfiles.length === 0 && (
            <p className="mt-1.5 text-xs text-stone-400">
              Bạn chưa có tổ chức nào.{" "}
              <Link href="/organizer/profile" className="text-amber-600 hover:underline">
                Tạo tổ chức
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Admin: searchable org dropdown */}
      {isAdmin && adminOrgs.length > 0 && (
        <div>
          <Label htmlFor="ev-organizer">Ban tổ chức <span className="text-red-500">*</span></Label>
          <div className="relative mt-1">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 pointer-events-none" />
            <select
              id="ev-organizer"
              value={data.organizerIdOverride ?? ""}
              onChange={(e) => onChange({ organizerIdOverride: e.target.value || null })}
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Chọn ban tổ chức --</option>
              {adminOrgs.map((o) => (
                <option key={o.userId} value={o.userId}>{o.organizationName}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Title + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="ev-title">Tên sự kiện <span className="text-red-500">*</span></Label>
          <Input
            id="ev-title"
            value={data.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="mt-1"
            placeholder="VD: Đêm nhạc Hà Nội 2026"
          />
        </div>
        <div>
          <Label htmlFor="ev-category">Danh mục</Label>
          <select
            id="ev-category"
            value={data.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">-- Chọn danh mục --</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Slug (create mode only) */}
      {isCreateMode && (
        <div>
          <Label htmlFor="ev-slug">Đường dẫn (slug)</Label>
          <div className="flex items-center mt-1 gap-1">
            <span className="text-stone-400 text-sm shrink-0">/events/</span>
            <Input
              id="ev-slug"
              value={data.slug}
              onChange={(e) => onChange({ slug: toSlug(e.target.value) })}
              className="flex-1"
              placeholder="ten-su-kien"
            />
          </div>
        </div>
      )}

      {/* Location type + details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
        <div>
          <Label>Hình thức tổ chức</Label>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => onChange({ isOnline: false })}
              className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${!data.isOnline ? "border-amber-500 bg-amber-50 text-amber-700" : "border-stone-300 text-stone-600 hover:border-stone-400"}`}
            >
              Trực tiếp
            </button>
            <button
              type="button"
              onClick={() => onChange({ isOnline: true })}
              className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${data.isOnline ? "border-amber-500 bg-amber-50 text-amber-700" : "border-stone-300 text-stone-600 hover:border-stone-400"}`}
            >
              Trực tuyến
            </button>
          </div>
        </div>

        {data.isOnline ? (
          <div className="sm:col-span-2">
            <Label htmlFor="ev-online-url">Link tham gia</Label>
            <Input
              id="ev-online-url"
              value={data.onlineUrl}
              onChange={(e) => onChange({ onlineUrl: e.target.value })}
              className="mt-1"
              placeholder="https://meet.google.com/..."
            />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="ev-venue">Địa điểm</Label>
              <Input
                id="ev-venue"
                value={data.venue}
                onChange={(e) => onChange({ venue: e.target.value })}
                className="mt-1"
                placeholder="Tên sân khấu, địa chỉ..."
              />
            </div>
            <div>
              <Label htmlFor="ev-city">Tỉnh / Thành phố</Label>
              <select
                id="ev-city"
                value={data.city}
                onChange={(e) => onChange({ city: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Chọn tỉnh thành --</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Description */}
      <div>
        <Label>Mô tả sự kiện</Label>
        <div className="mt-1">
          <RichTextEditor
            value={data.description}
            onChange={(html) => onChange({ description: html })}
            placeholder="Giới thiệu về sự kiện của bạn..."
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={onNext}
          disabled={!validate()}
          className="bg-amber-600 hover:bg-amber-700 min-w-28"
        >
          Tiếp theo →
        </Button>
      </div>
    </div>
  );
}
