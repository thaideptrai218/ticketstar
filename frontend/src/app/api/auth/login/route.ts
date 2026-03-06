import { NextRequest, NextResponse } from "next/server";
import {
  proxyToBackend,
  parseJson,
  errorResponse,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_BASE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
} from "../_proxy-helpers";

interface LoginBody {
  success: boolean;
  data?: { accessToken?: string; mfaRequired?: boolean; mfaToken?: string };
  error?: string;
  errors?: Record<string, string[]>;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.text();
    const backendRes = await proxyToBackend(
      "/api/auth/login",
      { method: "POST", body },
      req.headers.get("cookie"),
    );

    const json = await parseJson<LoginBody>(backendRes);
    if (!json) return errorResponse("Lỗi máy chủ", 502);

    const nextRes = NextResponse.json(json, { status: backendRes.status });

    if (json.success && json.data?.accessToken) {
      // Set access token cookie (path=/)
      nextRes.cookies.set(ACCESS_TOKEN_COOKIE, json.data.accessToken, {
        ...COOKIE_BASE,
        maxAge: ACCESS_MAX_AGE,
      });

      // Extract refresh token from backend Set-Cookie and re-set with path=/
      const setCookies = backendRes.headers.getSetCookie?.() ?? [];
      for (const cookie of setCookies) {
        const match = cookie.match(/refresh_token=([^;]+)/);
        if (match) {
          nextRes.cookies.set(REFRESH_TOKEN_COOKIE, match[1], {
            ...COOKIE_BASE,
            maxAge: REFRESH_MAX_AGE,
          });
        }
      }
    }

    return nextRes;
  } catch {
    return errorResponse("Không thể kết nối đến máy chủ", 503);
  }
}
