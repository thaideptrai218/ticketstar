"use client";

// Drag-drop image upload zone — uploads directly to backend /api/files/upload
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5010";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploadZoneProps {
  label: string;
  /** Dimension hint shown to user e.g. "1280x720" */
  dimensions?: string;
  /** Current image URL (relative from backend or full URL) */
  value: string | null;
  onChange: (url: string) => void;
}

export function ImageUploadZone({ label, dimensions, value, onChange }: ImageUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use raw fetch with FormData — apiFetch forces JSON Content-Type which breaks multipart
      const res = await fetch(`${API_URL}/api/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Upload thất bại");
      }

      const { url } = await res.json();
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    maxSize: MAX_SIZE,
    maxFiles: 1,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      setError(err?.code === "file-too-large" ? "Tệp quá lớn (tối đa 5MB)" : "Chỉ chấp nhận jpg, png, webp");
    },
  });

  const previewUrl = value ? (value.startsWith("http") ? value : `${API_URL}${value}`) : null;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-stone-700">
        {label}
        {dimensions && <span className="ml-1 text-xs text-stone-400">({dimensions})</span>}
      </p>

      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors overflow-hidden
          ${isDragActive ? "border-amber-500 bg-amber-50" : "border-stone-300 hover:border-amber-400 bg-stone-50"}`}
        style={{ minHeight: 120 }}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="preview" className="w-full h-32 object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-stone-400 text-sm">
            {uploading ? (
              <span>Đang tải lên...</span>
            ) : isDragActive ? (
              <span>Thả ảnh vào đây</span>
            ) : (
              <>
                <span className="text-2xl mb-1">🖼️</span>
                <span>Kéo thả hoặc click để chọn ảnh</span>
                <span className="text-xs mt-0.5">JPG, PNG, WEBP · tối đa 5MB</span>
              </>
            )}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {previewUrl && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="text-xs text-stone-400 hover:text-red-500 transition-colors"
        >
          Xóa ảnh
        </button>
      )}
    </div>
  );
}
