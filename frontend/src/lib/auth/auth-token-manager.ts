// Token utilities — decode only.
// Tokens are now httpOnly cookies managed by Next.js proxy routes.
// JS cannot read httpOnly cookies, so no storage helpers are needed.

import { jwtDecode } from "jwt-decode";
import type { AuthUser } from "./auth-types";

// Matches actual claim names set by backend TokenService.GenerateAccessToken
interface JwtPayload {
  sub: string;
  email: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  email_verified: string; // "true" | "false"
  sid: string;            // sessionId
  exp: number;
}

/** Decode JWT and return AuthUser. Returns null if token is invalid or expired. */
export function decodeUser(token: string): AuthUser | null {
  try {
    const p = jwtDecode<JwtPayload>(token);
    if (p.exp * 1000 < Date.now()) return null;
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
