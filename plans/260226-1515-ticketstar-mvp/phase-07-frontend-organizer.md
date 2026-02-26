# Phase 7 — Frontend Organizer Pages

## Context Links
- [Plan Overview](plan.md) | [Phase 4](phase-04-frontend-auth-and-layout.md)

## Overview
- **Priority:** P2 | **Status:** pending | **Effort:** 10h
- **Depends on:** Phase 3, 4
- Organizer dashboard, event CRUD, ticket type management, check-in view, payout

## Related Code Files
**Create:**
- `frontend/src/app/(organizer)/dashboard/page.tsx` — overview stats
- `frontend/src/app/(organizer)/events/page.tsx` — my events list
- `frontend/src/app/(organizer)/events/new/page.tsx` — create event form
- `frontend/src/app/(organizer)/events/[id]/edit/page.tsx` — edit event
- `frontend/src/app/(organizer)/events/[id]/ticket-types/page.tsx` — manage ticket types
- `frontend/src/app/(organizer)/events/[id]/orders/page.tsx` — event orders
- `frontend/src/app/(organizer)/events/[id]/checkin/page.tsx` — check-in stats
- `frontend/src/app/(organizer)/events/[id]/staff/page.tsx` — staff management
- `frontend/src/app/(organizer)/payout/page.tsx` — payout summary
- `frontend/src/app/(organizer)/payout/[eventId]/page.tsx` — event payout detail
- `frontend/src/components/organizer/event-form.tsx` — create/edit form (shared)
- `frontend/src/components/organizer/ticket-type-form.tsx`
- `frontend/src/components/organizer/ticket-type-list.tsx`
- `frontend/src/components/organizer/event-stats-card.tsx`
- `frontend/src/components/organizer/orders-table.tsx`
- `frontend/src/components/organizer/staff-management.tsx`
- `frontend/src/components/organizer/payout-summary-card.tsx`
- `frontend/src/types/organizer.ts` — dashboard stats types

## Implementation Steps

### 1. Dashboard
1. Server Component, fetch organizer stats from multiple endpoints
2. Cards: total events, total orders, total revenue, upcoming events
3. Quick links to event management, payouts

### 2. Event Management
1. **Events list:** table with status badge, title, date, actions (edit, publish/unpublish)
2. **Create event form:** React Hook Form + Zod validation
   - Fields: title, description (textarea), venue, startAt, endAt, image URL
   - Submit → `POST /api/events`
3. **Edit event form:** same form, prefilled, `PUT /api/events/{id}`
4. **Publish/Unpublish:** button with confirmation dialog

### 3. Ticket Type Management
1. List ticket types for event in table
2. Add form (dialog): name, price, quota, sale start/end dates
3. Edit inline or via dialog
4. Delete with confirmation (only if soldCount == 0)

### 4. Event Orders View
1. Table: order ID, buyer email, status, total, date
2. Paginated, filterable by status

### 5. Check-in Stats
1. Show per-ticket-type: total tickets, checked-in count, percentage bar
2. Auto-refresh via React Query (refetchInterval: 10s)

### 6. Staff Management
1. List assigned staff (name, email)
2. Add staff by email → `POST /api/events/{eventId}/staff`
3. Remove staff → `DELETE /api/events/{eventId}/staff/{userId}`

### 7. Payout
1. Summary page: all events with revenue, fees, net payout
2. Detail page: breakdown by ticket type, order list

## Todo List
- [ ] Create organizer dashboard with stats cards
- [ ] Create event list page with actions
- [ ] Create event create/edit form with validation
- [ ] Implement publish/unpublish toggle
- [ ] Create ticket type management (CRUD)
- [ ] Create event orders table
- [ ] Create check-in stats view
- [ ] Create staff management page
- [ ] Create payout summary + detail pages
- [ ] Sidebar navigation for organizer section

## Success Criteria
- Create event → add ticket types → publish → visible on marketplace
- Edit event details, publish/unpublish
- View orders for each event
- Check-in stats update in real-time
- Staff management works (assign/remove)
- Payout shows correct revenue breakdown

## Risk Assessment
- **Form complexity:** keep forms simple with shadcn form components + Zod
- **Dashboard query count:** batch where possible, use React Query for caching

## Security Considerations
- All endpoints verify organizer owns the event (backend)
- Middleware ensures Organizer role

## Next Steps
- Phase 8: Staff + Admin pages
