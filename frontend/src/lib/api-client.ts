// Browser-side typed fetch wrapper with auto-refresh on 401
//
// NOTE: This client calls the .NET backend directly with credentials: 'include'.
// This requires the backend CORS config to allow the frontend origin explicitly
// (not '*') with allowCredentials: true — see backend Cors settings in appsettings.json.
// Auth cookies (ts_at, refresh_token) are httpOnly and sent automatically by the browser.

// All browser API calls go through the Next.js proxy (/api/backend/*)
// so mobile/LAN devices don't need direct access to the backend server.
const BASE_URL = "/api/backend";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: { success?: boolean; data?: T; error?: string; message?: string; errors?: Record<string, string[]> } | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError("Lỗi máy chủ. Vui lòng thử lại.", res.status);
  }
  if (!res.ok || body?.success === false) {
    const msg = body?.error ?? body?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
    throw new ApiError(msg, res.status, body?.errors);
  }
  return (body?.data ?? {}) as T;
}

// Refresh promise queue — all concurrent 401s wait on the same refresh attempt
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

/** Browser-side fetch. All concurrent 401s share one refresh attempt, then retry. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (res.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        credentials: "include",
        ...init,
        headers,
      });
      return parseResponse<T>(retryRes);
    }
  }

  return parseResponse<T>(res);
}
