// Proxy: POST /api/auth/mfa/disable — reads ts_at cookie, forwards as Bearer token

import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend, parseJson, errorResponse, ACCESS_TOKEN_COOKIE } from "../../_proxy-helpers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return errorResponse("Unauthenticated", 401);

  try {
    const body = await req.text();
    const backendRes = await proxyToBackend(
      "/api/auth/mfa/disable",
      { method: "POST", body, headers: { Authorization: `Bearer ${token}` } },
    );
    const json = await parseJson<unknown>(backendRes);
    return NextResponse.json(json ?? { success: true }, { status: backendRes.status });
  } catch {
    return errorResponse("Không thể kết nối đến máy chủ", 503);
  }
}
