// Proxy: POST /api/auth/mfa/challenge — no auth required (uses mfaToken in body)

import { NextRequest, NextResponse } from "next/server";
import {
  proxyToBackend,
  copySetCookieHeaders,
  parseJson,
  errorResponse,
  ACCESS_TOKEN_COOKIE,
  COOKIE_BASE,
  ACCESS_MAX_AGE,
} from "../../_proxy-helpers";

interface MfaChallengeBody {
  success: boolean;
  data?: { accessToken?: string };
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.text();
    const backendRes = await proxyToBackend(
      "/api/auth/mfa/challenge",
      { method: "POST", body },
      req.headers.get("cookie"),
    );

    const json = await parseJson<MfaChallengeBody>(backendRes);
    if (!json) return errorResponse("Lỗi máy chủ", 502);

    const nextRes = NextResponse.json(json, { status: backendRes.status });
    copySetCookieHeaders(backendRes, nextRes);

    if (json.success && json.data?.accessToken) {
      nextRes.cookies.set(ACCESS_TOKEN_COOKIE, json.data.accessToken, {
        ...COOKIE_BASE,
        maxAge: ACCESS_MAX_AGE,
      });
    }

    return nextRes;
  } catch {
    return errorResponse("Không thể kết nối đến máy chủ", 503);
  }
}
