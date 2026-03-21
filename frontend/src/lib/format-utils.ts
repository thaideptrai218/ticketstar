// Shared formatting utilities for Vietnamese locale

const API_URL = "/api/backend";

/**
 * Resolves a backend-uploaded image URL to an absolute URL.
 * Relative paths like "/uploads/..." are prefixed with the API base URL.
 * External URLs (https://...) are returned as-is.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

/** Format VND price (no decimals, Vietnamese dong symbol) */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

/** Format date to Vietnamese locale (e.g. "15 tháng 3, 2026") */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format full date with weekday */
export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format time (e.g. "19:00") */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
