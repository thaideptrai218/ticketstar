# Phase 6 — Frontend Attendee Pages

## Context Links
- [Plan Overview](plan.md) | [Phase 4](phase-04-frontend-auth-and-layout.md)

## Overview
- **Priority:** P2 | **Status:** pending | **Effort:** 6h
- **Depends on:** Phase 3, 4
- My Tickets (QR display), Order History, Ticket Transfer

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
- [ ] Create My Tickets page with QR display
- [ ] Create TicketCard + TicketQrDisplay components
- [ ] Create TicketTransferDialog
- [ ] Create Orders list page
- [ ] Create Order detail page with cancel/refund actions
- [ ] Mobile responsive layout

## Success Criteria
- My Tickets shows all tickets with scannable QR codes
- Transfer changes ticket ownership and regenerates QR
- Order history shows correct statuses
- Cancel/refund actions work from order detail

## Risk Assessment
- **Large QR images on mobile:** SVG scales well, no issue
- **Transfer abuse:** backend should rate-limit transfers

## Security Considerations
- All pages auth-gated via middleware
- Transfer requires ticket ownership validation (backend)

## Next Steps
- Phase 7: Organizer pages
