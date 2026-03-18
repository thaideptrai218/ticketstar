"use client";

// Step 1: Cover/banner images, title, category, location type, description
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "./image-upload-zone";
import { RichTextEditor } from "./rich-text-editor";
import { fetchProvinces } from "@/lib/vn-provinces";
import type { WizardState } from "./event-wizard";

const CATEGORIES = ["Âm nhạc", "Thể thao", "Nghệ thuật", "Công nghệ", "Ẩm thực", "Giáo dục", "Khác"];

interface Step1Props {
  data: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  isCreateMode: boolean;
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

export function Step1EventInfo({ data, onChange, onNext, isCreateMode }: Step1Props) {
  const [provinces, setProvinces] = useState<string[]>([]);

  useEffect(() => {
    fetchProvinces().then(setProvinces);
  }, []);

  function handleTitleChange(title: string) {
    const update: Partial<WizardState> = { title };
    if (isCreateMode) update.slug = toSlug(title);
    onChange(update);
  }

  function validate(): boolean {
    return data.title.trim().length > 0;
  }

  return (
    <div className="space-y-6">
      {/* Images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Title */}
      <div>
        <Label htmlFor="ev-title">Tên sự kiện *</Label>
        <Input
          id="ev-title"
          value={data.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="mt-1"
          placeholder="VD: Đêm nhạc Hà Nội 2026"
        />
      </div>

      {/* Slug (create mode only) */}
      {isCreateMode && (
        <div>
          <Label htmlFor="ev-slug">Đường dẫn (slug)</Label>
          <div className="flex items-center mt-1 gap-1">
            <span className="text-stone-400 text-sm">/events/</span>
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

      {/* Category */}
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

      {/* Location type */}
      <div>
        <Label>Hình thức tổ chức</Label>
        <div className="flex gap-3 mt-1">
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

      {/* Location details */}
      {data.isOnline ? (
        <div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      )}

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
