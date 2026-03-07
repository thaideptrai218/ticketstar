import { NextRequest, NextResponse } from "next/server";
import {
  proxyToBackend,
  parseJson,
  errorResponse,
  extractRefreshTokenFromResponse,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  COOKIE_BASE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
} from "../_proxy-helpers";

interface RefreshBody {
  success: boolean;
  data?: { accessToken?: string };
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const backendRes = await proxyToBackend(
      "/api/auth/refresh",
      { method: "POST" },
      req.headers.get("cookie"),
    );

    const json = await parseJson<RefreshBody>(backendRes);
    if (!json) return errorResponse("Lỗi máy chủ", 502);

    const nextRes = NextResponse.json(json, { status: backendRes.status });

    if (json.success && json.data?.accessToken) {
      nextRes.cookies.set(ACCESS_TOKEN_COOKIE, json.data.accessToken, {
        ...COOKIE_BASE,
        maxAge: ACCESS_MAX_AGE,
      });

      // Re-set rotated refresh token with path=/
      const refreshValue = extractRefreshTokenFromResponse(backendRes);
      if (refreshValue) {
        nextRes.cookies.set(REFRESH_TOKEN_COOKIE, refreshValue, {
          ...COOKIE_BASE,
          maxAge: REFRESH_MAX_AGE,
        });
      }
    }

    return nextRes;
  } catch {
    return errorResponse("Không thể kết nối đến máy chủ", 503);
  }
}
