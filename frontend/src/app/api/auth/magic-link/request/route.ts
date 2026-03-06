import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend, parseJson, errorResponse } from "../../_proxy-helpers";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.text();
    const backendRes = await proxyToBackend(
      "/api/auth/magic-link/request",
      { method: "POST", body },
      req.headers.get("cookie"),
    );

    const json = await parseJson<{ success: boolean; error?: string }>(backendRes);
    return NextResponse.json(json ?? { success: true }, { status: backendRes.status });
  } catch {
    return errorResponse("Không thể kết nối đến máy chủ", 503);
  }
}
