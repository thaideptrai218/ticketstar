# Code Review: Frontend Auth Implementation

**Date:** 2026-03-02
**Reviewer:** code-reviewer
**Scope:** 17 files, ~1400 LOC
**Focus:** Security, React patterns, TypeScript, code quality, edge cases

## Overall Assessment

Solid implementation. Clean separation of concerns (api client / token manager / context / components). Good accessibility (aria attributes, role="alert"). Zod validation on all forms. Well-typed discriminated union for MFA login flow.

Several security issues need attention, one critical.

---

## Critical Issues

### 1. Open Redirect via `returnUrl` (login-form.tsx:55)

**File:** `/home/welterial/projects/ticketstar/frontend/src/components/auth/login-form.tsx`

```typescript
const returnUrl = searchParams.get("returnUrl") ?? "/";
// ...
router.push(returnUrl);
```

Attacker can craft `https://ticketstar.com/login?returnUrl=https://evil.com` to redirect users post-login. This is a classic phishing vector.

**Fix:** Validate that returnUrl is a relative path:

```typescript
function getSafeReturnUrl(raw: string | null): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search : "/";
  } catch {
    return raw.startsWith("/") ? raw : "/";
  }
}
```

### 2. Access Token in Non-HttpOnly Cookie (auth-token-manager.ts:29-33)

**File:** `/home/welterial/projects/ticketstar/frontend/src/lib/auth/auth-token-manager.ts`

The access token is stored in a JS-readable cookie (`ts_at`). While the comment explains the rationale (JS needs it for Bearer header), this exposes the token to XSS. The token is also stored in `memoryToken` module variable.

**Mitigation (medium-term):** Consider a BFF (Backend-for-Frontend) pattern where the Next.js server proxies API calls and manages tokens server-side. For now, the short 5-min expiry and httpOnly refresh token mitigate risk acceptably.

**Immediate concern:** The `Secure` flag is omitted in dev mode (line 31). This is correct for local dev but ensure `NODE_ENV` is always `production` in deployed environments.

---

## High Priority

### 3. MFA Secret Exposed in Client State (mfa-setup-wizard.tsx:31)

**File:** `/home/welterial/projects/ticketstar/frontend/src/components/auth/mfa-setup-wizard.tsx`

```typescript
const [secret, setSecret] = useState<string>("");
```

The TOTP secret is stored in React state and rendered as plain text (line 108). This is necessary for manual entry but:
- The secret persists in React DevTools memory until component unmounts
- Consider clearing the secret when moving to step 2 (`verify`), since user no longer needs it

**Fix:** Clear secret on step transition:
```typescript
const handleNextStep = () => {
  setSecret(""); // Clear from memory
  setStep("verify");
};
```

### 4. No MFA Status from Backend (security/page.tsx:29)

**File:** `/home/welterial/projects/ticketstar/frontend/src/app/(app)/settings/security/page.tsx`

```typescript
const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
```

MFA status is `null` on page load with a confusing message "Trang thai MFA chua xac dinh." The user has no way to know their actual MFA state without toggling it.

**Fix:** Add a `GET /api/auth/mfa/status` endpoint to the backend, or include `mfaEnabled` in the JWT claims so `AuthUser` carries this info.

### 5. `authFetch` Does Not Parse Validation Errors (auth-api-client.ts:62-68)

**File:** `/home/welterial/projects/ticketstar/frontend/src/lib/auth/auth-api-client.ts`

`AuthApiError` has a `fieldErrors` property but it is never populated:

```typescript
// fieldErrors is defined but never set
throw new AuthApiError(message, response.status);
```

Backend returns `{ errors: Record<string, string[]> }` for 400 validation errors, but these are lost.

**Fix:**
```typescript
if (!response.ok || body?.success === false) {
  const message = body?.error ?? body?.message ?? "Da xay ra loi.";
  const fieldErrors = (body as any)?.errors as Record<string, string[]> | undefined;
  throw new AuthApiError(message, response.status, fieldErrors);
}
```

### 6. JSON.parse Without Try-Catch (auth-api-client.ts:62)

**File:** `/home/welterial/projects/ticketstar/frontend/src/lib/auth/auth-api-client.ts`

```typescript
const body: ApiEnvelope<T> | null = text ? JSON.parse(text) : null;
```

If backend returns non-JSON (e.g., HTML error page from reverse proxy, 502), this throws an unhandled `SyntaxError`.

**Fix:**
```typescript
let body: ApiEnvelope<T> | null = null;
if (text) {
  try { body = JSON.parse(text); } catch { /* non-JSON response */ }
}
```

---

## Medium Priority

### 7. PasswordInput Duplicated (login-form.tsx:23-41, register-form.tsx:17-35)

Identical `PasswordInput` component in both files. Extract to `components/ui/password-input.tsx`.

### 8. Logo Block Duplicated (login-form.tsx:110-120, register-form.tsx:65-75)

Same logo markup in login and register forms. Extract to a shared component or move to auth layout.

### 9. Login Form at 280 LOC (login-form.tsx)

**File:** `/home/welterial/projects/ticketstar/frontend/src/components/auth/login-form.tsx`

Exceeds the 200 LOC convention. After extracting `PasswordInput` and the logo, it should drop under limit.

### 10. Security Page at 210 LOC (security/page.tsx)

Slightly over limit. The disable form could be extracted to a separate component.

### 11. Cookie Parsing Edge Case (auth-token-manager.ts:40)

```typescript
return match ? decodeURIComponent(match.split("=")[1]) : null;
```

If the JWT value contains `=` (base64 padding, though JWTs use base64url without padding), `split("=")[1]` would truncate. Safer:

```typescript
return match ? decodeURIComponent(match.substring(match.indexOf("=") + 1)) : null;
```

### 12. Circular Dependency Risk (auth-context.tsx:42)

`handleTokenReceived` references `doSilentRefresh` and vice versa. Currently works via the eslint-disable comment, but fragile. Consider combining into a single function or using `useRef` for the refresh callback.

---

## Low Priority

### 13. `Smartphone` Import Unused (mfa-setup-wizard.tsx:5)

`Smartphone` imported from lucide-react but never used. Tree-shaking handles this, but clean it up.

### 14. Recovery Codes Copy May Fail (recovery-codes-display.tsx:15)

`navigator.clipboard.writeText` can throw if permissions denied. Wrap in try-catch.

### 15. No Rate Limiting Feedback on Login

Forms don't specifically handle 429 status. The generic error message works but a specific "Too many attempts, try again later" would be better UX.

---

## Positive Observations

- Discriminated union `LoginResponse` with `isMfaChallenge` type guard is clean
- Refresh token deduplication via `refreshPromise` ref prevents concurrent refresh calls
- `restoreTokenFromCookie` checks expiry before using cached token
- Minimum 60s refresh delay prevents tight loops on short-lived tokens
- Good accessibility: `aria-invalid`, `aria-describedby`, `role="alert"`, `aria-hidden` on icons
- `Suspense` boundaries for `useSearchParams` (required in Next.js 15)
- Proper `autoComplete` attributes on all form fields
- Auth layout redirects authenticated users away from login/register

---

## Recommended Actions (Priority Order)

1. **Fix open redirect** in `returnUrl` handling (Critical, ~10 min)
2. **Wrap JSON.parse** in try-catch in `authFetch` (High, ~5 min)
3. **Parse field errors** in `AuthApiError` (High, ~10 min)
4. **Add MFA status** to JWT claims or create status endpoint (High, ~30 min backend)
5. **Extract PasswordInput** to shared component (Medium, ~10 min)
6. **Extract logo** to shared component (Medium, ~5 min)
7. **Fix cookie parsing** for values containing `=` (Medium, ~5 min)
8. **Clear MFA secret** after step transition (High, ~2 min)

---

## Metrics

- Type Coverage: ~95% (all API types well-defined, one `any` cast needed for fieldErrors fix)
- Test Coverage: 0% (no frontend tests yet)
- Linting Issues: 1 (eslint-disable for circular hook deps)
- Files Over 200 LOC: 2 (login-form.tsx: 280, security/page.tsx: 210)

---

## Unresolved Questions

1. Is there a plan to add frontend tests? The auth flow is complex enough to warrant integration tests.
2. Will the backend add `mfaEnabled` to JWT claims, or should a separate endpoint be created?
3. Is a BFF pattern planned for production to avoid JS-accessible access tokens?
