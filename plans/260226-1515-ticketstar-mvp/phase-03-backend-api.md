# Phase 3 — Backend API

## Context Links
- [Plan Overview](plan.md) | [Phase 2](phase-02-database-and-identity.md)
- [Backend Research](research/researcher-01-backend.md)

## Overview
- **Priority:** P1 | **Status:** pending | **Effort:** 16h
- **Depends on:** Phase 2
- All REST API endpoints for events, orders, tickets, check-in, staff, refund, payout

## Key Insights
- Redis distributed lock for ticket quota enforcement during order creation
- Order expiry via BackgroundService (1min poll)
- Mock SePay: POST /orders/{id}/pay triggers 3-5s delayed status change
- QR: HMAC-SHA256 signed payload, base64 PNG via QRCoder
- MassTransit publishes email events (order confirmation, magic link)

## Requirements
### Functional
- Events CRUD (organizer-scoped)
- TicketTypes CRUD (nested under event)
- Order creation with quota locking, expiry, cancellation
- Mock payment with webhook delay simulation
- Ticket issuance on payment, QR generation
- Check-in: scan QR, validate HMAC, anti-duplicate
- Staff assignment per event
- Refund (cancel paid order, release tickets)
- Transfer ticket to another user
- Payout reconciliation view for organizer

### Non-Functional
- All endpoints return consistent JSON envelope: `{ data, error, message }`
- Pagination: `?page=1&pageSize=20` for list endpoints
- Authorization via `[Authorize(Roles = "...")]`
- All money as `decimal(10,2)`

## Architecture

### API Controllers
```
API/Controllers/
├── AuthController.cs           # (from Phase 2)
├── EventsController.cs         # CRUD, publish/unpublish
├── TicketTypesController.cs    # CRUD under event
├── OrdersController.cs         # Create, cancel, list, pay
├── TicketsController.cs        # List my tickets, transfer
├── CheckInController.cs        # Scan, validate
├── StaffController.cs          # Assign/remove staff to event
├── AdminController.cs          # Lock/unlock users
└── PayoutController.cs         # Organizer payout view
```

### Application Services
```
Application/
├── Interfaces/
│   ├── IEventService.cs
│   ├── IOrderService.cs
│   ├── ITicketService.cs
│   ├── ICheckInService.cs
│   ├── IPaymentService.cs
│   ├── IStaffService.cs
│   └── IPayoutService.cs
├── Services/
│   ├── EventService.cs
│   ├── OrderService.cs
│   ├── TicketService.cs
│   ├── CheckInService.cs
│   ├── PaymentService.cs      # Mock SePay logic
│   ├── StaffService.cs
│   └── PayoutService.cs
├── DTOs/
│   ├── Events/                 # CreateEventRequest, EventResponse, EventListResponse
│   ├── TicketTypes/            # CreateTicketTypeRequest, TicketTypeResponse
│   ├── Orders/                 # CreateOrderRequest, OrderResponse, OrderItemRequest
│   ├── Tickets/                # TicketResponse (includes base64 QR)
│   ├── CheckIn/                # CheckInRequest, CheckInResponse
│   ├── Staff/                  # AssignStaffRequest
│   ├── Payout/                 # PayoutSummaryResponse
│   └── Common/                 # ApiResponse<T>, PagedResult<T>
└── Mapping/
    └── MappingExtensions.cs    # Manual extension methods (no AutoMapper)
```

### Infrastructure Services
```
Infrastructure/
├── Data/ (from Phase 2)
├── Services/
│   ├── TicketLockService.cs    # Redis distributed lock
│   ├── QrCodeService.cs        # HMAC sign + QRCoder PNG
│   └── OrderExpiryService.cs   # BackgroundService
├── Messaging/
│   ├── Messages/
│   │   ├── OrderConfirmationEmail.cs
│   │   ├── MagicLinkEmail.cs
│   │   └── TicketTransferEmail.cs
│   └── Consumers/
│       ├── OrderConfirmationEmailConsumer.cs   # Console stub
│       ├── MagicLinkEmailConsumer.cs           # Console stub
│       └── TicketTransferEmailConsumer.cs      # Console stub
└── Repositories/
    ├── IRepository.cs          # Generic: GetById, Add, Update, Delete, Query
    ├── Repository.cs
    ├── IOrderRepository.cs     # GetPendingExpired, GetByUser
    └── OrderRepository.cs
```

## Related Code Files
**Create:** All files listed in Architecture section above.

**Modify:**
- `Program.cs` — register all services, MassTransit, Redis, BackgroundService, repositories

## Implementation Steps

### 1. Common Infrastructure
1. Create `ApiResponse<T>` wrapper: `{ Data, Error, Message, Success }`
2. Create `PagedResult<T>`: `{ Items, Page, PageSize, TotalCount }`
3. Create generic `IRepository<T>` + `Repository<T>` using EF Core
4. Create `IOrderRepository` with `GetPendingExpired()`, `GetByUserId()`
5. Register repositories in DI

### 2. Redis Ticket Lock Service
1. Implement `TicketLockService` per research report pattern
2. `TryReserveTicketsAsync(ticketTypeId, quantity)`:
   - Acquire lock `lock:tickettype:{id}` with 10s TTL
   - Read current SoldCount from DB
   - Check remaining >= quantity
   - Increment Redis counter `sold:{ticketTypeId}`
   - Release lock
3. `ReleaseTicketsAsync(ticketTypeId, quantity)` — decrement Redis counter
4. Register `IConnectionMultiplexer` singleton in DI

### 3. Events API
1. `GET /api/events` — list published events, paginated, filterable (search, date range)
2. `GET /api/events/{slug}` — public event detail with ticket types
3. `POST /api/events` — create (Organizer only)
4. `PUT /api/events/{id}` — update (owner Organizer only)
5. `POST /api/events/{id}/publish` — set status Published
6. `POST /api/events/{id}/unpublish` — set status Draft
7. `DELETE /api/events/{id}` — soft delete / cancel
8. `GET /api/events/my` — organizer's events list
9. EventService: validate ownership, generate slug from title, enforce rules (can't publish without ticket types)

### 4. Ticket Types API
1. `GET /api/events/{eventId}/ticket-types` — list
2. `POST /api/events/{eventId}/ticket-types` — create (Organizer, own event)
3. `PUT /api/events/{eventId}/ticket-types/{id}` — update
4. `DELETE /api/events/{eventId}/ticket-types/{id}` — delete (only if 0 sold)

### 5. Orders API
1. `POST /api/orders` — create order:
   - Validate event published, sale window open
   - For each item: `TicketLockService.TryReserveTicketsAsync()`
   - If any lock fails: release all acquired, return 409
   - Create Order (Pending) + OrderItems, ExpiresAt = now + 15min
   - Return order with payment instructions
2. `POST /api/orders/{id}/pay` — mock payment:
   - Validate order is Pending, not expired, owned by user
   - Create Payment record (Pending)
   - Start background task: `Task.Delay(Random(3000,5000))` then:
     - Update Payment → Success
     - Update Order → Paid, set PaidAt
     - Update DB SoldCount for each TicketType
     - Generate Tickets with QR codes
     - Publish OrderConfirmationEmail via MassTransit
   - Return immediately with `{ status: "processing" }`
3. `GET /api/orders/{id}` — order detail (poll for status after pay)
4. `GET /api/orders` — user's orders, paginated
5. `POST /api/orders/{id}/cancel` — cancel pending order, release reservations
6. `POST /api/orders/{id}/refund` — refund paid order: cancel tickets, update SoldCount, set status Cancelled

### 6. Order Expiry Background Service
1. `OrderExpiryService : BackgroundService`
2. Every 60s: query `Orders.Where(Status == Pending && ExpiresAt < UtcNow)`
3. For each: set Expired, release Redis counters per OrderItem
4. Batch SaveChanges

### 7. Tickets API
1. `GET /api/tickets` — my tickets (attendee), includes base64 QR PNG
2. `GET /api/tickets/{id}` — single ticket detail
3. `POST /api/tickets/{id}/transfer` — transfer to another user by email
   - Validate ticket not checked in
   - Change UserId
   - Regenerate QR (new HMAC with new userId)
   - Publish TicketTransferEmail

### 8. QR Code Service
1. `QrCodeService`:
   - `GenerateQrData(ticketId, eventId, userId)` → HMAC-SHA256 signed string
   - `GenerateQrImage(qrData)` → base64 PNG via QRCoder
   - `ValidateQrData(qrData)` → verify HMAC, extract ticketId
2. Secret key from config (QR:HmacSecret)

### 9. Check-In API
1. `POST /api/checkin/scan` — body: `{ qrData, eventId }`
   - Validate HMAC signature
   - Lookup ticket by QrCode
   - Verify ticket belongs to event
   - Check `IsCheckedIn` — if true, return 409 "Already checked in"
   - Set `IsCheckedIn = true`, create CheckIn record
   - Return ticket + attendee info
2. `GET /api/checkin/{eventId}/stats` — checked-in count vs total for event
3. Authorization: Staff assigned to event OR Organizer who owns event

### 10. Staff API
1. `POST /api/events/{eventId}/staff` — assign staff user (Organizer only)
2. `DELETE /api/events/{eventId}/staff/{userId}` — remove assignment
3. `GET /api/events/{eventId}/staff` — list assigned staff

### 11. Admin API
1. `GET /api/admin/users` — paginated user list (Admin only)
2. `POST /api/admin/users/{id}/lock` — set IsLocked = true
3. `POST /api/admin/users/{id}/unlock` — set IsLocked = false

### 12. Payout API
1. `GET /api/payout/events/{eventId}` — organizer payout summary:
   - Total revenue (sum of paid orders)
   - Platform fee (configurable %, e.g., 5%)
   - Net payout amount
   - Order breakdown by ticket type
2. `GET /api/payout/summary` — all events summary for organizer

### 13. RabbitMQ Email Stubs
1. Define message records: `OrderConfirmationEmail`, `MagicLinkEmail`, `TicketTransferEmail`
2. Create consumers that log to console (stub)
3. Register MassTransit in Program.cs

### 14. Global Error Handling
1. Create exception middleware: catch exceptions, return ApiResponse with error
2. Custom exceptions: `NotFoundException`, `ConflictException`, `ForbiddenException`

## Todo List
- [ ] Create ApiResponse<T> + PagedResult<T>
- [ ] Create generic repository
- [ ] Implement TicketLockService (Redis)
- [ ] Implement EventService + EventsController
- [ ] Implement TicketType endpoints
- [ ] Implement OrderService + OrdersController (create, pay, cancel, refund)
- [ ] Implement mock payment with delayed webhook
- [ ] Implement OrderExpiryService (BackgroundService)
- [ ] Implement QrCodeService (HMAC + QRCoder)
- [ ] Implement TicketService (list, detail, transfer)
- [ ] Implement CheckInService + CheckInController
- [ ] Implement StaffService + StaffController
- [ ] Implement AdminController (lock/unlock)
- [ ] Implement PayoutService + PayoutController
- [ ] Create MassTransit message records + stub consumers
- [ ] Create global error handling middleware
- [ ] Register all services in Program.cs
- [ ] Verify Swagger shows all endpoints

## Success Criteria
- All endpoints accessible via Swagger
- Create event → add ticket types → create order → pay → tickets issued with QR
- Order expires after 15min if unpaid
- Check-in validates QR + prevents duplicate scan
- Staff can only check in events they're assigned to
- Refund releases tickets and updates SoldCount

## Risk Assessment
- **Race conditions on ticket quota** — Redis lock mitigates; test concurrent orders
- **Mock payment delay** — use `Task.Run` with delay, not blocking; consider Hangfire if complexity grows
- **QR HMAC key rotation** — store key version in QR data for future rotation support

## Security Considerations
- All mutation endpoints require authentication
- Organizer endpoints verify event ownership
- Staff endpoints verify event assignment
- Admin endpoints require Admin role
- Input validation on all DTOs (FluentValidation or DataAnnotations)
- Rate limiting on order creation (prevent abuse)

## Next Steps
- Phase 4-8: Frontend consumes these APIs
