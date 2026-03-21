// Generic reverse proxy — forwards all browser API/static requests to the .NET backend.
// This ensures the browser always calls the same origin (Next.js), so LAN/mobile devices
// don't need direct access to the backend server.
//
// BACKEND_URL is a server-only env var (no NEXT_PUBLIC_ prefix) so it's never sent to clients.
// Fallback to NEXT_PUBLIC_API_URL for backwards compatibility.

import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5010";

// Headers that must not be forwarded (hop-by-hop or Next.js-managed)
const SKIP_HEADERS = new Set(["transfer-encoding", "connection", "keep-alive", "host"]);

async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  // Strip /api/backend prefix to get actual backend path (e.g. /api/events)
  const backendPath = pathname.replace(/^\/api\/backend/, "");
  const url = `${BACKEND_URL}${backendPath}${search}`;

  // Forward only safe/necessary request headers
  const forwardHeaders = new Headers();
  for (const key of ["cookie", "content-type", "authorization", "accept", "accept-language"]) {
    const val = req.headers.get(key);
    if (val) forwardHeaders.set(key, val);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const res = await fetch(url, {
    method: req.method,
    headers: forwardHeaders,
    body: hasBody ? req.body : undefined,
    // Required for streaming request body (e.g. file uploads)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(hasBody ? ({ duplex: "half" } as any) : {}),
  });

  // Forward response headers back to browser
  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.append(key, value);
    }
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
