import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

// NOTE: JWT is decoded here without signature verification (no JWKS in Edge Runtime).
// This is intentional — proxy is a UX guard only (fast redirect, no network call).
// The backend validates the token on every API call and is the real enforcement point.
// Route prefix → allowed roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/organizer": ["Organizer", "Admin"],
  "/admin": ["Admin"],
  "/attendee": ["User", "Attendee", "Admin"],
  "/staff": ["Staff", "Admin", "Organizer"],
};

interface JwtPayload {
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  exp: number;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const protectedEntry = Object.entries(PROTECTED_ROUTES)
    .find(([prefix]) => pathname.startsWith(prefix));

  if (!protectedEntry) return NextResponse.next();

  const [, requiredRoles] = protectedEntry;
  const token = request.cookies.get("ts_at")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);

    // Reject expired tokens
    if (payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    if (!requiredRoles.includes(role)) {
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
  matcher: ["/organizer/:path*", "/admin/:path*", "/attendee/:path*", "/staff/:path*"],
};
