// Server-side typed fetch wrapper — forwards cookies from incoming request

import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5010";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Server component fetch — forwards browser cookies to backend, no retry logic. */
export async function apiFetchServer<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let body: { success?: boolean; data?: T; error?: string; message?: string; errors?: Record<string, string[]> } | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError("Lỗi máy chủ. Vui lòng thử lại.", res.status);
  }

  if (!res.ok || body?.success === false) {
    const msg = body?.error ?? body?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
    throw new ApiError(msg, res.status, body?.errors);
  }

  return (body?.data ?? {}) as T;
}
