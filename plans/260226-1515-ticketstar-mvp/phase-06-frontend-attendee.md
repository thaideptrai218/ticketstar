# Phase 6 — Frontend Attendee Pages

## Context Links
- [Plan Overview](plan.md) | [Phase 5](phase-05-frontend-marketplace.md) | [Phase 7](phase-07-frontend-organizer.md)

## Overview
- **Priority:** P2 | **Status:** completed | **Effort:** 6h
- **Depends on:** Phase 3, 4
- My Tickets (QR display), Order History, Ticket Transfer — ALL COMPLETE

## Related Code Files
**Create:**
- `frontend/src/app/(attendee)/my-tickets/page.tsx`
- `frontend/src/app/(attendee)/orders/page.tsx`
- `frontend/src/app/(attendee)/orders/[id]/page.tsx`
- `frontend/src/components/tickets/ticket-card.tsx` — ticket with QR
- `frontend/src/components/tickets/ticket-qr-display.tsx` — QR code render
- `frontend/src/components/tickets/ticket-transfer-dialog.tsx`
- `frontend/src/components/orders/order-card.tsx`
- `frontend/src/components/orders/order-detail.tsx`

## Implementation Steps

### 1. My Tickets Page
1. Server Component, fetch `GET /api/tickets` via api-server
2. Display as card grid, each card shows: event name, date, venue, ticket type, QR code
3. `TicketQrDisplay`: use `react-qr-code` to render SVG QR from `ticket.qrData`
4. Show check-in status badge (Checked In / Valid)
5. Transfer button opens `TicketTransferDialog`

### 2. Ticket Transfer
1. Dialog with email input (recipient)
2. `POST /api/tickets/{id}/transfer` via React Query mutation
3. On success: toast + refetch tickets (QR will be regenerated)
4. Validation: can't transfer checked-in tickets

### 3. Order History
1. Server Component, fetch `GET /api/orders` paginated
2. `OrderCard`: order ID, date, status badge (color-coded), total, item count
3. Click → order detail page

### 4. Order Detail
1. Server Component, fetch `GET /api/orders/{id}`
2. Show: items list (ticket type, quantity, unit price), total, status, timestamps
3. Cancel button for Pending orders → `POST /api/orders/{id}/cancel`
4. Refund button for Paid orders → `POST /api/orders/{id}/refund`

## Todo List
- [x] Create My Tickets page with QR display
- [x] Create TicketCard + TicketQrDisplay components
- [x] Create TicketTransferDialog
- [x] Create Orders list page
- [x] Create Order detail page with cancel/refund actions
- [x] Mobile responsive layout

## Success Criteria
- [x] My Tickets shows all tickets with scannable QR codes
- [x] Transfer changes ticket ownership and regenerates QR
- [x] Order history shows correct statuses
- [x] Cancel action works from order detail (refund deferred to organizer-only endpoint)

## Risk Assessment
- **Large QR images on mobile:** SVG scales well, no issue
- **Transfer abuse:** backend should rate-limit transfers

## Security Considerations
- All pages auth-gated via middleware
- Transfer requires ticket ownership validation (backend)

## Implementation Details

### Files Created
- `frontend/src/types/tickets.ts` — MyTicket, TicketDetail, TransferTicketRequest types
- `frontend/src/lib/order-status-config.ts` — shared order status badge config
- `frontend/src/components/tickets/ticket-card.tsx` — ticket display with transfer button
- `frontend/src/components/tickets/ticket-qr-display.tsx` — QR code renderer (base64 PNG from backend)
- `frontend/src/components/tickets/ticket-transfer-dialog.tsx` — email-based transfer dialog with validation
- `frontend/src/components/orders/order-card.tsx` — order list item with status badge
- `frontend/src/components/orders/order-detail.tsx` — full order details + cancel action

### Files Modified
- `frontend/src/app/(attendee)/layout.tsx` — horizontal tab nav (Vé của tôi / Đơn hàng / Cài đặt)
- `frontend/src/app/(attendee)/attendee/my-tickets/page.tsx` — server component + grid layout
- `frontend/src/app/(attendee)/attendee/orders/page.tsx` — paginated order history
- `frontend/src/app/(attendee)/attendee/orders/[id]/page.tsx` — order detail with items + payment
- `frontend/src/app/(attendee)/attendee/settings/page.tsx` — redirect to /settings/security

### Design Decisions
- QR codes: base64 PNG inline (from backend) vs react-qr-code (chose backend PNG for consistency)
- Refund button: deferred (organizer-only endpoint, not in attendee UI)
- Layout: horizontal tabs instead of sidebar (mobile-friendly, compact)
- Vietnamese labels throughout (matching backend domain language)

## Next Steps
- Phase 7: Organizer pages (event creation, editing, statistics)
