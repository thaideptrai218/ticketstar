# Code Review — Phase 4 Frontend Auth Migration

**Date:** 2026-03-06
**Scope:** Next.js proxy route auth architecture
**Score: 7.5/10**

---

## Scope

- Files reviewed: middleware.ts, _proxy-helpers.ts, 13 proxy routes, auth-context.tsx, auth-api-client.ts, auth-token-manager.ts, api-client.ts, api-server.ts, role layouts
- LOC: ~600 total across reviewed files
- All files under 200 LOC limit — compliant

---

## Overall Assessment

Clean architecture. Proxy pattern is correctly implemented — tokens never exposed to client JS. Cookie flags are mostly correct. Two medium-severity issues and several low-priority items.

---

## Critical Issues

None.

---

## High Priority

### H1: `api-client.ts` bypasses the proxy — hits backend directly from browser

**File:** `frontend/src/lib/api-client.ts` line 40

```ts
const res = await fetch(`${BASE_URL}${path}`, { credentials: "include", ... });
```

`BASE_URL` points to `NEXT_PUBLIC_API_URL` (the backend at port 5010). The refresh retry on 401 correctly calls `/api/auth/refresh` (proxy), but the **original request and retry go directly to the backend**, not through a proxy. This means:
- The browser sends `ts_at` cookie directly to the backend, but `ts_at` has `SameSite=Lax` and `Path=/` — so it will be sent on cross-origin navigations only, not cross-origin XHR/fetch in most cases unless the backend is same-site.
- If `NEXT_PUBLIC_API_URL` is a different origin (e.g., `api.ticketstar.vn` vs `ticketstar.vn`), then `credentials: "include"` on a cross-origin fetch requires the backend to return `Access-Control-Allow-Credentials: true` AND the cookie's `SameSite=None; Secure`. But `ts_at` is set as `SameSite=Lax` by the proxy — this will silently fail to send.
- The intent of the proxy pattern (keep backend URL server-side only) is violated; `NEXT_PUBLIC_API_URL` is exposed in the JS bundle.

**Impact:** In production with separate domains, `apiFetch` will always get 401 (cookie not sent), triggering infinite refresh loops. The proxy architecture is undermined.

**Fix:** Route general API calls through Next.js proxy routes (e.g., `/api/proxy/[...path]`) or at minimum ensure frontend and backend share the same domain/subdomain so `SameSite=Lax` cookies work.

---

### H2: `isRefreshing` module-level singleton causes request queue loss

**File:** `frontend/src/lib/api-client.ts` lines 31, 46-65

```ts
let isRefreshing = false;
```

When multiple concurrent 401 responses arrive, only the first triggers a refresh — the rest fall through to `parseResponse` which throws on the original 401 response. Requests that arrive during refresh are not queued and retried; they fail with 401.

**Impact:** Any component that fires multiple API calls simultaneously (common on dashboard load) will have some calls fail if the token just expired.

**Fix:** Standard pattern is a refresh promise queue — store the in-flight refresh promise and attach all waiters to it.

---

## Medium Priority

### M1: Middleware JWT decode without signature verification — known risk, needs documentation

**File:** `frontend/src/middleware.ts` line 35

`jwtDecode` does NOT verify the JWT signature — it only base64-decodes. This is acceptable here because:
- The token is read from an httpOnly cookie the server set
- The Edge Runtime cannot use Node.js `crypto`
- An attacker who can forge httpOnly cookie values has already compromised the session

However: **a tampered token with a valid structure but wrong signature would pass the role check.** The risk is low (requires cookie tampering), but it should be documented explicitly. The backend will reject the Bearer token on actual API calls, so the damage is limited to UI-only access.

The comment `// Reject expired tokens` is present and the exp check is correct.

**Recommendation:** Add an explicit comment noting "signature not verified — backend enforces authorization on every API call."

---

### M2: `REFRESH_TOKEN_COOKIE` clear path mismatch on logout

**File:** `frontend/src/app/api/auth/logout/route.ts` lines 24-25

The logout route clears `refresh_token` with `REFRESH_COOKIE_CLEAR` which uses `path: "/api/auth"`. This is correct to match the backend-set cookie's path. However, `copySetCookieHeaders` is NOT called for logout — the backend's own `Set-Cookie: refresh_token=; Max-Age=0` header (if any) is discarded.

If the backend sets the refresh token cookie with `Path=/api/auth/refresh` (not `/api/auth`), the proxy clear with `Path=/api/auth` won't clear the backend-issued cookie. Verify the exact `Path` value the backend uses on its `refresh_token` cookie.

**Impact:** Stale `refresh_token` cookie persisting after logout → user can still call `/api/auth/refresh` successfully.

---

### M3: `api-server.ts` JwtPayload duplicate — DRY violation

`JwtPayload` interface is defined in three places:
- `middleware.ts` (partial — role + exp only)
- `auth-token-manager.ts` (full)
- `app/api/auth/me/route.ts` (full duplicate of auth-token-manager.ts)

The `/me` route duplicates the decode logic from `auth-token-manager.ts#decodeUser`. It should import and call `decodeUser(token)` instead of re-implementing.

---

## Low Priority

### L1: `proxyFetch` returns `{} as T` on empty data field

**File:** `frontend/src/lib/auth/auth-api-client.ts` line 68

```ts
return (body?.data ?? {}) as T;
```

For `void` return types (`logout`, `revokeAll`) this is harmless. For typed responses it silently returns `{}` if the backend omits `data`, which TypeScript treats as the full type — potential runtime errors when callers access fields.

---

### L2: `returnUrl` open redirect risk (low)

**File:** `frontend/src/middleware.ts` line 30

```ts
loginUrl.searchParams.set("returnUrl", pathname);
```

`pathname` is always a path (no host), so open redirect is not possible here. However, ensure the login page validates `returnUrl` on redirect to prevent protocol-relative redirect if the value is ever taken from query params elsewhere.

---

### L3: Role layout files have no auth guard — rely entirely on middleware

**Files:** `(organizer)/layout.tsx`, `(admin)/layout.tsx`, etc.

The role layouts render content without checking auth state from `AuthContext`. Access control is enforced exclusively by middleware. This is architecturally correct (middleware is the enforcement point), but if the middleware `matcher` config ever misses a route, the layout will render without protection. Consider adding a client-side guard (`useAuth` + redirect) as defense-in-depth for sensitive admin pages.

---

### L4: `getSetCookie` fallback may fail on older runtimes

**File:** `frontend/src/app/api/auth/_proxy-helpers.ts` line 50

```ts
const setCookieHeaders = backendRes.headers.getSetCookie?.() ?? [];
```

`Headers.prototype.getSetCookie` is relatively new (Node 18.14+ / undici 5.x). The optional chain `?.()` silently returns `[]` if unavailable, dropping all backend Set-Cookie headers including the refresh token. Verify the Node version in deployment matches.

---

## Edge Cases Found by Scout

1. **Concurrent logout + refresh race:** If a request fires `/api/auth/refresh` while `/api/auth/logout` is processing, the refresh may succeed and issue a new access token cookie after logout has cleared it — user remains authenticated. No deduplication/abort mechanism exists.

2. **MFA token in response body exposed to client:** Login and magic-link routes return `mfaToken` in the JSON body to the browser. This is a short-lived token for the MFA challenge step — acceptable, but it passes through the response unredacted. Confirm the backend treats `mfaToken` as single-use and short-lived (5 minutes or less).

3. **`auth-context.tsx` hydration on every render:** The `fetchCurrentUser()` call runs once on mount. If the user opens a new tab, `/api/auth/me` is called again — not a bug but worth noting if `/me` becomes expensive.

4. **Missing `credentials: "include"` in `refreshUser`:** `refreshUser` calls `fetchCurrentUser` which already has `credentials: "include"` — correct. But it does not trigger a token refresh if the access token is expired; it just returns null. Callers of `refreshUser` may get null unexpectedly after token expiry without a refresh attempt.

---

## Positive Observations

- Access token never touches JS storage (localStorage/sessionStorage) — correct httpOnly design
- `proxyToBackend` properly forwards the full cookie header for routes that need `refresh_token`
- `copySetCookieHeaders` using `getSetCookie()` (vs `get("set-cookie")`) correctly handles multiple Set-Cookie headers — important for refresh token rotation
- Proxy routes are thin and focused — no business logic leaks
- `COOKIE_BASE` / `REFRESH_COOKIE_CLEAR` constants prevent flag drift across routes
- `auth-token-manager.ts` decode-only pattern is clean
- Middleware `matcher` config is explicit — no accidental route matching
- Error messages in Vietnamese consistent throughout

---

## Recommended Actions (Priority Order)

1. **[H1]** Decide: either route all API calls through Next.js proxy or confirm frontend and backend are same-site in production. Update `api-client.ts` accordingly.
2. **[H2]** Implement refresh queue in `api-client.ts` to handle concurrent 401s.
3. **[M2]** Verify exact `Path` of backend `refresh_token` cookie and ensure logout proxy clear matches.
4. **[M3]** Replace `/me` route's inline decode with `decodeUser()` from `auth-token-manager.ts`.
5. **[L3]** Add client-side auth guard to admin/organizer layouts as defense-in-depth.
6. **[L4]** Add Node version check or polyfill note for `getSetCookie`.

---

## Metrics

- Type Coverage: High — all routes and helpers are typed; minor `unknown` casts in MFA routes
- Test Coverage: Not assessed (frontend tests not present in scope)
- Linting Issues: 0 apparent syntax errors; `as T` casts in parseResponse/proxyFetch are the only soft concerns

---

## Unresolved Questions

1. Are `NEXT_PUBLIC_API_URL` and the Next.js app on the same domain/subdomain in production? This determines whether H1 is a real bug or acceptable.
2. What is the exact `Path` attribute on the backend-issued `refresh_token` cookie? (needed to confirm M2)
3. What is the `mfaToken` TTL on the backend? (edge case #2)
4. Is there a `getSetCookie` polyfill or minimum Node version enforced in CI/CD? (L4)
