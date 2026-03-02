import { jwtDecode } from "jwt-decode";
import type { AuthUser } from "./auth-types";

// ─── Cookie-based token storage ───────────────────────────────────────────────
// Stored in a Secure; SameSite=Strict cookie so it survives page refresh.
// Not httpOnly — JS must read it to attach as Bearer header.
// The httpOnly refresh token (set by backend) handles session persistence.

const COOKIE_NAME = "ts_at"; // TicketStar access token
const IS_DEV = process.env.NODE_ENV === "development";

// Mirrors in-memory for quick sync access (cookie read is slower)
let memoryToken: string | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

// Matches actual claim names set by backend TokenService.GenerateAccessToken
interface JwtPayload {
  sub: string;
  email: string;
  // ClaimTypes.Role serializes to this URI in JWT
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  email_verified: string; // "true" | "false"
  sid: string;            // sessionId
  exp: number;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function setCookie(value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  const secure = IS_DEV ? "" : "; Secure";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; SameSite=Strict; Path=/${secure}; Max-Age=${maxAgeSeconds}`;
}

function getCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  // Use substring to avoid truncating values containing '='
  return match ? decodeURIComponent(match.substring(match.indexOf("=") + 1)) : null;
}

function deleteCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; SameSite=Strict; Path=/; Max-Age=0`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return memoryToken ?? getCookie();
}

export function setToken(token: string): void {
  memoryToken = token;
  const maxAge = Math.max(0, Math.floor(getExpiresIn(token) / 1000));
  setCookie(token, maxAge);
}

export function clearToken(): void {
  memoryToken = null;
  deleteCookie();
}

/** Read token from cookie on page load (avoids calling /refresh if cookie exists) */
export function restoreTokenFromCookie(): string | null {
  const token = getCookie();
  if (!token) return null;
  // Discard if already expired
  if (getExpiresIn(token) <= 0) {
    deleteCookie();
    return null;
  }
  memoryToken = token;
  return token;
}

/** Decode JWT and return AuthUser. Returns null if token is invalid. */
export function decodeUser(token: string): AuthUser | null {
  try {
    const p = jwtDecode<JwtPayload>(token);
    return {
      id: p.sub,
      email: p.email,
      role: p["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
      emailVerified: p.email_verified === "true",
      sessionId: p.sid,
    };
  } catch {
    return null;
  }
}

/** Returns milliseconds until token expiry. Returns 0 if expired or invalid. */
export function getExpiresIn(token: string): number {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    return Math.max(0, exp * 1000 - Date.now());
  } catch {
    return 0;
  }
}

/** Schedule a token refresh ~30s before expiry. Minimum 60s to prevent rapid loops. */
export function scheduleRefresh(onRefresh: () => void, token: string): void {
  cancelScheduledRefresh();
  const expiresIn = getExpiresIn(token);
  if (expiresIn <= 0) return;
  const delay = Math.max(60_000, expiresIn - 30_000);
  refreshTimer = setTimeout(onRefresh, delay);
}

export function cancelScheduledRefresh(): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}
