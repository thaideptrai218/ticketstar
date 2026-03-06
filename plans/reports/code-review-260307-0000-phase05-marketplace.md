# Code Review: Phase 5 — Frontend Marketplace

**Date:** 2026-03-07
**Reviewer:** code-reviewer
**Scope:** 17 files (15 new, 2 modified), ~750 LOC
**Build:** Passes (0 errors)

## Overall Assessment

Solid implementation. Clean component architecture, proper SSR/client split, good auth guard placement. A few issues worth fixing — one high-priority type mismatch, one medium security concern, and some DRY violations.

## Critical Issues

None.

## High Priority

### H1. `OrderDetailResponse` missing `paymentUrl` field in frontend type

Backend `OrderDetailResponse` does NOT include `paymentUrl`, but the frontend `OrderDetail extends Order` inherits `paymentUrl: string | null` from `Order`. This won't cause runtime errors (extra field is just `undefined`), but it's misleading. More importantly, `OrderDetail` on the frontend adds a `paymentUrl` field that the backend never returns for the detail endpoint.

**File:** `frontend/src/types/orders.ts:33`
**Fix:** Define `OrderDetail` independently (not extending `Order`), matching `OrderDetailResponse` exactly — which lacks `paymentUrl` and `paidAt`.

### H2. `use-event-search.ts` — search triggers on every keystroke

`setSearch` updates state immediately and fires the `useEffect` fetch on every character typed. No debounce. This hammers the API during fast typing.

**File:** `frontend/src/hooks/use-event-search.ts:48-55, 66-95`
**Fix:** Add a 300ms debounce on the search value before triggering the fetch. Keep the input state responsive but debounce the API call.

### H3. `use-checkout.ts` — async operations inside `setInterval` can overlap

If `apiFetch` takes >2s, the next interval fires before the previous resolves. Multiple poll requests can overlap and cause race conditions on state updates.

**File:** `frontend/src/hooks/use-checkout.ts:51-82`
**Fix:** Use `setTimeout` with recursive scheduling instead of `setInterval`, or add an `isPolling` guard ref.

### H4. Checkout page fetches event by ID but detail page links with slug

`event-detail-client.tsx:41` navigates to `/checkout?eventId=${event.id}&items=...` passing the event UUID. The checkout page then calls `/api/events/${eventId}` (line 41). Verify the backend supports fetching events by ID at this path — the SSR detail page uses `/api/events/slug/${slug}` which is a different endpoint.

**File:** `frontend/src/app/(app)/checkout/page.tsx:41`
**Action:** Confirm backend has `GET /api/events/{id}` endpoint. If not, pass slug instead and use the slug endpoint.

## Medium Priority

### M1. `formatPrice` duplicated across 3 files with inconsistent suffix

- `event-card.tsx:9` uses `"d"` with diacritics `"đ"`
- `ticket-type-selector.tsx:9` uses `"d"` (no diacritics)
- `checkout-form.tsx:9` uses `"d"` (no diacritics)

**Fix:** Extract to a shared `format-currency.ts` util. Use consistent suffix (`"đ"`).

### M2. `formatDate`/`formatTime` duplicated in `event-card.tsx` and `event-detail-client.tsx`

**Fix:** Extract to shared `format-date.ts` util.

### M3. Checkout URL params not validated/sanitized

`checkout/page.tsx` parses `items` param as `typeId:qty` pairs (line 30-34) but does no validation:
- `Number(qty)` on garbage input returns `NaN` — this flows into the order request
- No check that `eventId` is a valid UUID format

**Fix:** Add validation: skip pairs where `qty` is NaN or <= 0, redirect to `/events` if `eventId` is empty.

### M4. `paymentState!` non-null assertion

`checkout/page.tsx:86` uses `paymentState!` which could be null if `step` transitions to "processing" before `paymentState` is set (shouldn't happen with current code, but fragile).

**Fix:** Add a null guard or default to "processing".

### M5. Public layout always shows "Dang nhap" — no auth awareness

`(public)/layout.tsx:30` hardcodes a login link. If user is already authenticated, they still see "Dang nhap" instead of their profile/menu.

**Fix:** Use `useAuth()` context (requires converting to client component or extracting navbar to a client component).

## Low Priority

### L1. `featured-events-section.tsx` cards are not wired to real events

The landing page cards use hardcoded mock data and are not `<Link>` elements — they don't navigate anywhere. The "Dat ve ngay" button is non-functional.

**Note:** This is pre-existing, not introduced in this phase. Worth a follow-up ticket.

### L2. Missing `aria-label` on stepper buttons

`ticket-type-selector.tsx` Plus/Minus buttons lack accessible labels.

### L3. `Suspense` boundaries have no fallback

`events/page.tsx:88` and `checkout/page.tsx:127` use `<Suspense>` without a `fallback` prop. Works but shows nothing during hydration of `useSearchParams`.

## Positive Observations

- SSR for event detail with `generateMetadata` and OpenGraph — good for SEO
- Checkout behind `ProtectedRoute` via `(app)` layout — auth guard properly placed
- `useCheckout` state machine is well-structured with proper cleanup on unmount
- Race condition handling in `useEventSearch` with `cancelled` flag
- 409 conflict handling for sold-out tickets in `placeOrder`
- Proper `credentials: "include"` for httpOnly cookie auth
- Component decomposition is clean and files are under 200 LOC
- Good skeleton loading states

## Recommended Actions (Priority Order)

1. **H2** — Add debounce to search (user-facing perf issue)
2. **H3** — Switch polling from `setInterval` to recursive `setTimeout`
3. **M1+M2** — Extract shared `formatPrice`, `formatDate`, `formatTime` utils
4. **M3** — Validate checkout URL params
5. **H1** — Fix `OrderDetail` type to match backend DTO
6. **H4** — Verify `GET /api/events/{id}` endpoint exists
7. **M5** — Add auth awareness to public layout navbar

## Unresolved Questions

1. Does the backend support `GET /api/events/{id}` (by UUID)? The SSR page only uses `/api/events/slug/{slug}`. If not, checkout will 404.
2. Does the backend `ListEvents` endpoint support a `search` query param? The hook passes it but the comment on line 74 suggests it doesn't exist yet.
3. What happens when a user navigates directly to `/checkout` with no params? Currently shows "Khong tim thay su kien" which is acceptable but could be friendlier with a redirect.
