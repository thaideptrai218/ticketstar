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
  try {
    const backendRes = await proxyToBackend(
      "/api/auth/logout",
      { method: "POST" },
      req.headers.get("cookie"),
    );

    const json = await parseJson<{ success: boolean; error?: string }>(backendRes);
    const nextRes = NextResponse.json(json ?? { success: true }, { status: backendRes.status });

    // Clear both cookies regardless of backend response
    nextRes.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
    nextRes.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...REFRESH_COOKIE_CLEAR, maxAge: 0 });

    return nextRes;
  } catch {
    return errorResponse("Không thể kết nối đến máy chủ", 503);
  }
}
