// Shared helpers for auth proxy route handlers

import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5010";

const IS_PROD = process.env.NODE_ENV === "production";

export const ACCESS_TOKEN_COOKIE = "ts_at";
// Must match backend CookieExtensions.RefreshTokenCookieName = "refresh_token"
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

// Refresh token cookie must be cleared with matching path/sameSite from backend
export const REFRESH_COOKIE_CLEAR = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "strict" as const,
  path: "/api/auth",
};

export const ACCESS_MAX_AGE = 5 * 60;          // 5 min
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/** Forward request to backend, returning the raw Response */
export async function proxyToBackend(
  backendPath: string,
  init: RequestInit,
  incomingCookieHeader?: string | null,
): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(incomingCookieHeader ? { Cookie: incomingCookieHeader } : {}),
    ...(init.headers ?? {}),
  };
  return fetch(`${BACKEND_URL}${backendPath}`, { ...init, headers });
}

/** Copy Set-Cookie headers from backend response to Next.js response */
export function copySetCookieHeaders(
  backendRes: Response,
  nextRes: NextResponse,
): void {
  const setCookieHeaders = backendRes.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookieHeaders) {
    nextRes.headers.append("Set-Cookie", cookie);
  }
}

/** Parse JSON body safely, returning null on failure */
export async function parseJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Build a JSON error response */
export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}
