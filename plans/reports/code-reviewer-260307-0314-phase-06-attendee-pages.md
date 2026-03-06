# Code Review: Phase 6 — Frontend Attendee Pages

**Date:** 2026-03-07 | **Reviewer:** code-reviewer | **Build:** PASS

## Scope

- **Files:** 11 (2 types, 1 layout, 4 pages, 4 components)
- **LOC:** ~770 total
- **Focus:** New Phase 6 attendee pages (tickets, orders, settings)

## Overall Assessment

Solid implementation. Clean component structure, consistent Vietnamese localization, proper loading/error/empty states on all pages. API integration matches backend endpoints correctly. One file exceeds the 200-line limit. A few type mismatches with backend DTOs and one logic bug in the QR display.

## Critical Issues

None.

## High Priority

### 1. `order-detail.tsx` exceeds 200-line limit (246 lines)

**File:** `C:\Users\welterial\ticketstar\frontend\src\components\orders\order-detail.tsx`

Per project convention, code files must stay under 200 lines. Extract the cancel confirmation dialog and/or the tickets section into separate components.

**Suggested split:**
- `order-cancel-dialog.tsx` — cancel confirmation dialog (lines 200-222)
- `order-tickets-section.tsx` — tickets with QR section (lines 149-197)
- Keep `InfoRow` as a shared utility or inline in the parent

### 2. `TicketDetailResponse.EventEndAt` is non-nullable on backend, nullable on frontend

**Backend:** `DateTime EventEndAt` (non-nullable)
**Frontend type (`tickets.ts` line 21):** `eventEndAt: string | null`

Fix: Change to `eventEndAt: string` in the frontend type to match.

### 3. QR display in order-detail shows wrong `eventTitle` — passes `ticketTypeName` instead

**File:** `C:\Users\welterial\ticketstar\frontend\src\components\orders\order-detail.tsx` lines 226-233

```tsx
<TicketQrDisplay
  eventTitle={selectedTicket.ticketTypeName || "Ve su kien"}  // BUG: should be event title
  ticketTypeName={selectedTicket.ticketTypeName || ""}
  eventStartAt={order.createdAt}  // BUG: should be event start time
/>
```

**Problems:**
- `eventTitle` receives ticket type name, not the event title. The `OrderTicket` type doesn't carry event title — consider adding it to the backend DTO or passing it from the order context.
- `eventStartAt` receives `order.createdAt` (order creation time), not the event's actual start time. The `OrderDetail` type lacks event start time — same solution needed.

**Impact:** User sees ticket type name as header and wrong date in QR dialog.

### 4. `STATUS_CONFIG` duplicated across `order-card.tsx` and `order-detail.tsx`

Violates DRY. Extract to a shared constant, e.g., `frontend/src/lib/order-status-config.ts`.

## Medium Priority

### 5. `apiFetch` sends `Content-Type: application/json` on GET requests

Not a Phase 6 issue, but all pages use `apiFetch` for GET calls which sets `Content-Type: application/json` header unnecessarily. Not harmful but technically incorrect — GET requests have no body. Low risk, note for future cleanup.

### 6. Refresh endpoint path mismatch potential

`api-client.ts` line 41 calls `/api/auth/refresh` for token refresh. This goes to the Next.js proxy, not directly to the .NET backend. Verify the proxy route exists and forwards correctly. (Build output confirms the route exists at `/api/auth/refresh`.)

### 7. `params.id` cast without validation

**File:** `C:\Users\welterial\ticketstar\frontend\src\app\(attendee)\attendee\orders\[id]\page.tsx` line 14

```tsx
const orderId = params.id as string;
```

If `params.id` is an array (Next.js catch-all), this silently breaks. Since the route is `[id]` (not `[...id]`), this is safe in practice but a defensive check or `String(params.id)` would be more robust.

### 8. No pagination on tickets or orders lists

Both `my-tickets/page.tsx` and `orders/page.tsx` fetch all records at once. For users with many tickets/orders, this could cause performance issues. Consider adding pagination or virtual scrolling in a future iteration.

## Low Priority

### 9. Settings page redirect could be a server component

`attendee/settings/page.tsx` correctly uses `redirect()` from `next/navigation` without `"use client"` — this is fine and already optimal.

### 10. Transfer dialog doesn't prevent self-transfer

The `ticket-transfer-dialog.tsx` validates email format but doesn't check if the user is transferring to themselves. Backend likely handles this, but a frontend hint would improve UX.

## Positive Observations

- All 4 page components properly handle loading, error, and empty states
- Vietnamese localization is consistent across all components
- `useCallback` + `useEffect` pattern used correctly for data fetching with refetch capability
- Transfer dialog properly blocks close during submission (`handleClose` checks `isSubmitting`)
- Form validation with zod + react-hook-form follows established patterns
- `apiFetch` error handling is consistent — `ApiError` check with Vietnamese fallback messages
- QR display reused between ticket-card and order-detail (good component reuse)
- Checked-in tickets correctly disable the transfer button
- Cancel action properly gated to `Pending` status only
- Fallback for unknown statuses in `STATUS_CONFIG` with `?? {}` pattern

## Recommended Actions (Priority Order)

1. **Fix QR display bug** in `order-detail.tsx` — wrong eventTitle and eventStartAt values
2. **Split `order-detail.tsx`** to stay under 200 lines
3. **Fix `TicketDetail.eventEndAt` nullability** to match backend
4. **Extract `STATUS_CONFIG`** to shared module

## Metrics

- **Build:** PASS (Next.js 16.1.6 Turbopack, 6.1s compile)
- **TypeScript:** No errors
- **File size violations:** 1 (`order-detail.tsx` at 246 lines)
- **Type mismatches with backend:** 1 (eventEndAt nullability)
- **Logic bugs:** 1 (QR display wrong data in order detail)

## Unresolved Questions

- Does `OrderTicket` backend DTO need `eventTitle` and `eventStartAt` fields for proper QR display? Currently missing, causing the workaround with wrong data.
- Should pagination be added to ticket/order list endpoints before launch, or is the current "fetch all" approach acceptable for expected data volumes?
