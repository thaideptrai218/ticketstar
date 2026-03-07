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

// Clear must match the same path/sameSite used when setting the cookie
export const REFRESH_COOKIE_CLEAR = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
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

/** Extract refresh token value from backend Set-Cookie headers.
 *  Uses getSetCookie() if available, falls back to headers.get('set-cookie'). */
export function extractRefreshTokenFromResponse(res: Response): string | null {
  // Prefer getSetCookie() — returns array of individual Set-Cookie strings
  const setCookies = (res.headers as Record<string, unknown> & Headers).getSetCookie?.();
  const sources: string[] =
    Array.isArray(setCookies) && setCookies.length > 0
      ? setCookies
      : // Fallback: raw get (safe for single Set-Cookie header)
        [res.headers.get("set-cookie") ?? ""];

  for (const cookie of sources) {
    const match = cookie.match(/refresh_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

/** Build a JSON error response */
export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}
