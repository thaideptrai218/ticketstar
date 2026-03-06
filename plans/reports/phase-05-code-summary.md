# Phase 5 — Frontend Marketplace: Code Summary

**Commit:** `14bbbb7` | **Scope:** Frontend + Docs | **+4049 / -106 lines**

---

## What Was Done

Built the public marketplace: event discovery, event detail, and a full checkout → payment polling flow.

---

## Route Structure

```
(public)/                     ← public layout (navbar + footer, no auth)
  events/page.tsx             ← event listing — CSR, debounced search, URL-synced pagination
  events/[slug]/page.tsx      ← event detail — SSR + generateMetadata() for SEO/OpenGraph
  events/[slug]/event-detail-client.tsx  ← ticket selector + "Buy" button

(app)/                        ← protected layout (ProtectedRoute)
  checkout/page.tsx           ← checkout flow — parses URL params, state machine
```

Landing page `/` unchanged (uses its own full-page layout). Search bar and "View all events" button wired to `/events`.

---

## New Types

**`types/events.ts`** — matches `EventDtos.cs`:
- `EventListItem` (list card data: slug, title, date, venue, minPrice, availableCount)
- `EventDetail` (full event: ticketTypes array, organizerName, description)
- `TicketType` (id, name, price, quota, soldCount, availableCount, maxPerUser)

**`types/orders.ts`** — matches `OrderDtos.cs`:
- `Order` (id, status, totalAmount, items, paymentUrl)
- `OrderDetail` (extends Order + tickets + payment) — **separate type, not extending Order** (backend DTOs differ)
- `CreateOrderRequest` / `CreateOrderItem`

---

## New Components

| Component | File | Purpose |
|---|---|---|
| `EventCard` | `components/events/event-card.tsx` | Card with image, date, venue, price badge, sold-out state |
| `EventGrid` | `components/events/event-grid.tsx` | Responsive CSS grid 1/2/3 cols + empty state |
| `EventFilters` | `components/events/event-filters.tsx` | Search input with clear button |
| `TicketTypeSelector` | `components/events/ticket-type-selector.tsx` | Per-type quantity stepper (+/-), respects `maxPerUser` + `availableCount` |
| `CheckoutForm` | `components/checkout/checkout-form.tsx` | Order summary table with subtotals + confirm button |
| `PaymentStatus` | `components/checkout/payment-status.tsx` | 4 states: `processing` (spinner), `success` (checkmark + links), `failed`, `expired` |

---

## New Hooks

### `useEventSearch` (`hooks/use-event-search.ts`)
- Reads `?q=` and `?page=` from URL on mount
- Fetches `GET /api/events` (public, no auth)
- **300ms debounce** on search input — prevents per-keystroke requests
- Race condition safe: `cancelled` flag + `clearTimeout` on cleanup
- Updates URL without full navigation (`router.replace`, `scroll: false`)

### `useCheckout` (`hooks/use-checkout.ts`)
- State machine: `confirming → processing → done`
- `placeOrder()`: `POST /api/orders` → on success, starts polling
- Polling: **recursive `setTimeout`** (not `setInterval`) — next poll only starts after previous response, no overlap
- Poll interval: 2s | Max: 60 polls (2 min) → auto-`expired`
- Terminal states: `paid/completed → success`, `cancelled/expired → expired`, `refunded/failed → failed`
- 409 conflict → toast "Het ve" (sold-out) without crashing
- Cleanup: `cancelledRef` + `clearTimeout` on unmount

---

## Shared Utilities

**`lib/format-utils.ts`** — eliminates duplication across 4+ files:
- `formatPrice(n)` → `"1.200.000đ"` (vi-VN locale, dong symbol)
- `formatDate(s)` → `"15 tháng 3, 2026"`
- `formatDateFull(s)` → `"Chủ nhật, 15 tháng 3, 2026"`
- `formatTime(s)` → `"19:00"`

---

## Checkout URL Protocol

Event detail passes selection to checkout via URL:
```
/checkout?eventId={uuid}&items={typeId}:{qty},{typeId}:{qty}
```

Checkout page parses and validates: rejects `NaN`, negative, zero quantities before fetching event or placing order.

---

## SEO

Event detail (`/events/[slug]`) is **Server Component** (SSR):
- `generateMetadata()` fetches event via `apiFetchServer` and returns `title`, `description`, `openGraph.images`
- Falls back gracefully if fetch fails (returns generic title)
- `notFound()` on 404/error from backend

---

## Code Review Fixes Applied

| Issue | Fix |
|---|---|
| `OrderDetail` type included `paymentUrl` (not in backend DTO) | Made separate type, removed field |
| Search fired on every keystroke | Added 300ms debounce |
| `setInterval` polling caused overlapping requests | Replaced with recursive `setTimeout` |
| `formatPrice` duplicated in 3 files with inconsistent suffix | Extracted to `format-utils.ts` |
| URL params not validated (NaN quantities) | Added `Number.isFinite(qty) && qty > 0` check |
| `paymentState!` non-null assertion | Guarded with explicit `&& paymentState` check |
