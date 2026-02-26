# Phase 5 — Frontend Marketplace

## Context Links
- [Plan Overview](plan.md) | [Phase 4](phase-04-frontend-auth-and-layout.md)

## Overview
- **Priority:** P1 | **Status:** pending | **Effort:** 10h
- **Depends on:** Phase 3, 4
- Homepage, event search/filter, event detail, checkout flow, mock payment UI

## Key Insights
- Homepage + event listing: ISR (revalidate 60s) for SEO + performance
- Event detail: SSR (real-time availability, SEO)
- Checkout: CSR (React Query mutations, dynamic state)
- Mock payment: show "Processing..." for 3-5s, poll order status

## Related Code Files
**Create:**
- `frontend/src/app/(public)/page.tsx` — homepage (featured events grid)
- `frontend/src/app/(public)/events/page.tsx` — event listing with search/filter
- `frontend/src/app/(public)/events/[slug]/page.tsx` — event detail
- `frontend/src/app/(public)/checkout/page.tsx` — checkout flow
- `frontend/src/components/events/event-card.tsx` — event card component
- `frontend/src/components/events/event-grid.tsx` — responsive grid
- `frontend/src/components/events/event-filters.tsx` — search, date, price filters
- `frontend/src/components/events/event-detail-header.tsx` — hero section
- `frontend/src/components/events/ticket-type-selector.tsx` — quantity picker per type
- `frontend/src/components/checkout/checkout-form.tsx` — order summary + confirm
- `frontend/src/components/checkout/payment-status.tsx` — processing/success/fail states
- `frontend/src/hooks/use-event-search.ts` — search params + React Query
- `frontend/src/hooks/use-checkout.ts` — checkout state machine
- `frontend/src/types/events.ts` — Event, TicketType response types
- `frontend/src/types/orders.ts` — Order, OrderItem types

## Implementation Steps

### 1. Types
1. Define `Event`, `TicketType`, `EventListResponse`, `EventDetailResponse`
2. Define `Order`, `OrderItem`, `CreateOrderRequest`

### 2. Homepage
1. Server Component, fetch featured/upcoming events via `api-server.ts`
2. ISR: `export const revalidate = 60`
3. Render `EventGrid` with `EventCard` components
4. Hero section with tagline + search bar (links to /events)

### 3. Event Listing Page
1. Client Component for interactive search/filter
2. `useEventSearch` hook: manages URL search params + React Query
3. Filters: text search, date range, price range (using shadcn Select, Input)
4. Paginated results with `PagedResult<Event>`
5. Skeleton loading states

### 4. Event Detail Page
1. Server Component, fetch by slug via SSR
2. `generateMetadata()` for SEO (title, description, OG image)
3. Sections: header (image, title, date, venue), description, ticket types
4. `TicketTypeSelector`: quantity +/- per type, shows price, remaining
5. "Buy Tickets" button → navigates to `/checkout` with selected items in URL params or state

### 5. Checkout Flow
1. Client Component page
2. `useCheckout` hook manages state: `selecting → confirming → processing → success/failed`
3. Steps:
   - **Summary:** order items, quantities, total
   - **Confirm:** "Place Order" button → `POST /api/orders` → get orderId
   - **Pay:** "Pay Now" → `POST /api/orders/{id}/pay` → show processing state
   - **Processing:** poll `GET /api/orders/{id}` every 2s until status != Pending
   - **Success:** show confirmation, link to "My Tickets"
   - **Failed/Expired:** show error, link back to event
4. Handle 409 (sold out) gracefully with toast notification
5. Require auth — redirect to login if unauthenticated (with return URL)

### 6. Components
1. `EventCard`: image, title, date, venue, price range badge
2. `EventGrid`: responsive CSS grid (1/2/3 cols)
3. `EventFilters`: search input + filter dropdowns
4. `TicketTypeSelector`: ticket type row with name, price, remaining, quantity stepper
5. `CheckoutForm`: order summary table + confirm button
6. `PaymentStatus`: loading spinner (processing), success check, error state

## Todo List
- [ ] Define event + order TypeScript types
- [ ] Create homepage with EventGrid (ISR)
- [ ] Create event listing with search/filter (CSR)
- [ ] Create event detail page (SSR + metadata)
- [ ] Create TicketTypeSelector component
- [ ] Create checkout page with state machine
- [ ] Create PaymentStatus component (processing/success/fail)
- [ ] Implement order polling after payment
- [ ] Handle sold-out (409) gracefully
- [ ] Add skeleton loading states
- [ ] Mobile responsive design

## Success Criteria
- Homepage loads with events, SEO metadata present
- Search/filter works with URL params (shareable)
- Event detail shows ticket types with availability
- Checkout: select → confirm → pay → processing → success flow works
- Sold-out shows clear error message
- All pages mobile responsive

## Risk Assessment
- **Stale availability data:** event detail SSR helps, but between page load and order creation, quota might change — 409 handling covers this
- **Checkout state loss on refresh:** use URL params for order ID after creation

## Security Considerations
- Checkout requires auth (middleware redirects)
- Never trust client-side price — backend validates
- Order amount calculated server-side

## Next Steps
- Phase 6: Attendee pages (my tickets, orders)
