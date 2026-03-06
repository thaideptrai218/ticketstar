// Proxy: POST /api/auth/revoke-all — reads ts_at cookie, forwards as Bearer token

import { NextRequest, NextResponse } from "next/server";
import {
  proxyToBackend,
  parseJson,
  errorResponse,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_BASE,
  REFRESH_COOKIE_CLEAR,
} from "../_proxy-helpers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return errorResponse("Unauthenticated", 401);

  try {
    const backendRes = await proxyToBackend(
      "/api/auth/revoke-all",
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    );
    const json = await parseJson<unknown>(backendRes);
    const nextRes = NextResponse.json(json ?? { success: true }, { status: backendRes.status });

    // Clear both cookies after revoking all sessions
    nextRes.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
    nextRes.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...REFRESH_COOKIE_CLEAR, maxAge: 0 });

    return nextRes;
  } catch {
    return errorResponse("Không thể kết nối đến máy chủ", 503);
  }
}
