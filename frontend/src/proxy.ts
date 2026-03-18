import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

// NOTE: JWT is decoded here without signature verification (no JWKS in Edge Runtime).
// This is intentional — proxy is a UX guard only (fast redirect, no network call).
// The backend validates the token on every API call and is the real enforcement point.

interface JwtPayload {
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  is_organizer?: string; // "true" | "false" — present on tokens issued after IsOrganizer migration
  exp: number;
}

/** Check whether a decoded JWT payload grants access to a route prefix. */
function canAccess(payload: JwtPayload, prefix: string): boolean {
  const role = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
  const isOrganizer = payload.is_organizer === "true";

  switch (prefix) {
    case "/organizer": return isOrganizer || role === "Admin";
    case "/admin":     return role === "Admin";
    case "/attendee":  return ["User", "Admin"].includes(role) || isOrganizer;
    default:           return false;
  }
}

const GUARDED_PREFIXES = ["/organizer", "/admin", "/attendee"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const prefix = GUARDED_PREFIXES.find((p) => pathname.startsWith(p));
  if (!prefix) return NextResponse.next();

  const token = request.cookies.get("ts_at")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);

    if (payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!canAccess(payload, prefix)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/organizer/:path*", "/admin/:path*", "/attendee/:path*"],
};
