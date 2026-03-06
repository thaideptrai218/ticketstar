# Phase 3 — Backend API

## Context Links

- [Plan Overview](plan.md) | [Phase 2](phase-02-database-and-identity.md)
- [Backend Research](research/researcher-01-backend.md)

## Overview

- **Priority:** P1 | **Status:** completed | **Effort:** 16h
- **Depends on:** Phase 2
- All REST API endpoints for events, orders, tickets, check-in, staff, refund, payout

## Key Insights

- Redis distributed lock for ticket quota enforcement during order creation
- Order expiry via BackgroundService (1min poll)
- Mock SePay: POST /orders/{id}/pay triggers 3-5s delayed status change
- QR: HMAC-SHA256 signed payload, base64 PNG via QRCoder
- MassTransit publishes email events (order confirmation, magic link)
- Code review identified 4 critical issues: layering violations, authorization gaps, webhook body double-read, page size limits — all fixed

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
- Pagination: `?page=1&pageSize=20` for list endpoints (pageSize capped at 100)
- Authorization via `[Authorize(Roles = "...")]`
- All money as `decimal(12,0)` (VND, no fractional units)

## Architecture

### API Controllers

```
API/Controllers/
├── ApiControllerBase.cs        # Base with consistent ApiResponse wrapping
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
│   ├── ITicketTypeService.cs
│   ├── IAdminService.cs
│   └── IPayoutService.cs
├── Services/
│   ├── EventService.cs
│   ├── OrderService.cs
│   ├── TicketService.cs
│   ├── CheckInService.cs
│   ├── PaymentService.cs      # Mock SePay logic
│   ├── StaffService.cs
│   ├── TicketTypeService.cs
│   ├── AdminService.cs
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
│       ├── OrderConfirmationEmailConsumer.cs   # Console stub (Phase 8)
│       ├── MagicLinkEmailConsumer.cs           # Console stub (Phase 8)
│       └── TicketTransferEmailConsumer.cs      # Console stub (Phase 8)
├── Repositories/
│   ├── IRepository.cs          # Generic: GetById, Add, Update, Delete, Query
│   ├── Repository.cs
│   ├── IOrderRepository.cs     # GetPendingExpired, GetByUser
│   └── OrderRepository.cs
└── Middleware/
    └── GlobalExceptionHandlerMiddleware.cs
```

## Related Code Files

**Create:** All files listed in Architecture section above.

**Modify:**

- `Program.cs` — register all services, MassTransit, Redis, BackgroundService, repositories
- `AppDbContext.cs` — add OrderStatus.Refunded, PaymentStatus.Refunded enum values

## Implementation Steps

### 1. Common Infrastructure

- [x] Create `ApiResponse<T>` wrapper: `{ Data, Error, Message, Success }`
- [x] Create `PagedResult<T>`: `{ Items, Page, PageSize, TotalCount }`
- [x] Create generic `IRepository<T>` + `Repository<T>` using EF Core
- [x] Create `IOrderRepository` with `GetPendingExpired()`, `GetByUserId()`
- [x] Register repositories in DI

### 2. Redis Ticket Lock Service

- [x] Implement `TicketLockService` per research report pattern
- [x] `TryReserveTicketsAsync(ticketTypeId, quantity)`:
    - Acquire lock `lock:tickettype:{id}` with 10s TTL
    - Read current SoldCount from DB
    - Check remaining >= quantity
    - Increment Redis counter `sold:{ticketTypeId}`
    - Release lock
- [x] `ReleaseTicketsAsync(ticketTypeId, quantity)` — decrement Redis counter
- [x] Register `IConnectionMultiplexer` singleton in DI

### 3. Events API

- [x] `GET /api/events` — list published events, paginated, filterable (search, date range)
- [x] `GET /api/events/{slug}` — public event detail with ticket types
- [x] `POST /api/events` — create (Organizer only)
- [x] `PUT /api/events/{id}` — update (owner Organizer only)
- [x] `POST /api/events/{id}/publish` — set status Published
- [x] `POST /api/events/{id}/unpublish` — set status Draft
- [x] `DELETE /api/events/{id}` — soft delete / cancel
- [x] `GET /api/events/my` — organizer's events list
- [x] EventService: validate ownership, generate slug from title, enforce rules (can't publish without ticket types)

### 4. Ticket Types API

- [x] `GET /api/events/{eventId}/ticket-types` — list
- [x] `POST /api/events/{eventId}/ticket-types` — create (Organizer, own event)
- [x] `PUT /api/events/{eventId}/ticket-types/{id}` — update
- [x] `DELETE /api/events/{eventId}/ticket-types/{id}` — delete (only if 0 sold)

### 5. Orders API

- [x] `POST /api/orders` — create order:
    - Validate event published, sale window open
    - For each item: `TicketLockService.TryReserveTicketsAsync()`
    - If any lock fails: release all acquired, return 409
    - Create Order (Pending) + OrderItems, ExpiresAt = now + 15min
    - Return order with payment instructions
- [x] `POST /api/orders/{id}/pay` — mock payment:
    - Validate order is Pending, not expired, owned by user
    - Create Payment record (Pending)
    - Start background task: `Task.Delay(Random(3000,5000))` then:
        - Update Payment → Success
        - Update Order → Paid, set PaidAt
        - Update DB SoldCount for each TicketType
        - Generate Tickets with QR codes
        - Publish OrderConfirmationEmail via MassTransit
    - Return immediately with `{ status: "processing" }`
- [x] `GET /api/orders/{id}` — order detail (poll for status after pay)
- [x] `GET /api/orders` — user's orders, paginated
- [x] `POST /api/orders/{id}/cancel` — cancel pending order, release reservations
- [x] `POST /api/orders/{id}/refund` — refund paid order (organizer only): cancel tickets, update SoldCount, set status Refunded

### 6. Order Expiry Background Service

- [x] `OrderExpiryService : BackgroundService`
- [x] Every 60s: query `Orders.Where(Status == Pending && ExpiresAt < UtcNow)`
- [x] For each: set Expired, release Redis counters per OrderItem
- [x] Batch SaveChanges

### 7. Tickets API

- [x] `GET /api/tickets` — my tickets (attendee), includes base64 QR PNG
- [x] `GET /api/tickets/{id}` — single ticket detail
- [x] `POST /api/tickets/{id}/transfer` — transfer to another user by email
    - Validate ticket not checked in
    - Change UserId
    - Regenerate QR (new HMAC with new userId)
    - Publish TicketTransferEmail

### 8. QR Code Service

- [x] `QrCodeService`:
    - `GenerateQrData(ticketId, eventId, userId)` → HMAC-SHA256 signed string
    - `GenerateQrImage(qrData)` → base64 PNG via QRCoder
    - `ValidateQrData(qrData)` → verify HMAC, extract ticketId
- [x] Secret key from config (QR:HmacSecret)

### 9. Check-In API

- [x] `POST /api/checkin/scan` — body: `{ qrData, eventId }`
    - Validate HMAC signature
    - Lookup ticket by QrCode
    - Verify ticket belongs to event
    - Check `IsCheckedIn` — if true, return 409 "Already checked in"
    - Set `IsCheckedIn = true`, create CheckIn record
    - Return ticket + attendee info
- [x] `GET /api/checkin/{eventId}/stats` — checked-in count vs total for event
- [x] Authorization: Staff assigned to event OR Organizer who owns event

### 10. Staff API

- [x] `POST /api/events/{eventId}/staff` — assign staff user (Organizer only)
- [x] `DELETE /api/events/{eventId}/staff/{userId}` — remove assignment
- [x] `GET /api/events/{eventId}/staff` — list assigned staff (require organizer/staff auth)

### 11. Admin API

- [x] `GET /api/admin/users` — paginated user list (Admin only)
- [x] `POST /api/admin/users/{id}/lock` — set IsLocked = true
- [x] `POST /api/admin/users/{id}/unlock` — set IsLocked = false

### 12. Payout API

- [x] `GET /api/payout/events/{eventId}` — organizer payout summary:
    - Total revenue (sum of paid orders)
    - Platform fee (configurable %, e.g., 5%)
    - Net payout amount
    - Order breakdown by ticket type
- [x] `GET /api/payout/summary` — all events summary for organizer

### 13. RabbitMQ Email Stubs

- [x] Define message records: `OrderConfirmationEmail`, `MagicLinkEmail`, `TicketTransferEmail`
- [x] Create consumers that log to console (stub)
- [x] Register MassTransit in Program.cs

### 14. Global Error Handling

- [x] Create exception middleware: catch exceptions, return ApiResponse with error
- [x] Custom exceptions: `NotFoundException`, `ConflictException`, `ForbiddenException`

## Todo List

- [x] Create ApiResponse<T> + PagedResult<T>
- [x] Create generic repository
- [x] Implement TicketLockService (Redis)
- [x] Implement EventService + EventsController
- [x] Implement TicketType endpoints
- [x] Implement OrderService + OrdersController (create, pay, cancel, refund)
- [x] Implement mock payment with delayed webhook
- [x] Implement OrderExpiryService (BackgroundService)
- [x] Implement QrCodeService (HMAC + QRCoder)
- [x] Implement TicketService (list, detail, transfer)
- [x] Implement CheckInService + CheckInController
- [x] Implement StaffService + StaffController
- [x] Implement AdminController (lock/unlock) via AdminService
- [x] Implement PayoutService + PayoutController
- [x] Create MassTransit message records + stub consumers
- [x] Create global error handling middleware
- [x] Register all services in Program.cs
- [x] Verify build succeeds (0 errors, 0 warnings)

## Success Criteria

- [x] All endpoints accessible via Swagger
- [x] Create event → add ticket types → create order → pay → tickets issued with QR
- [x] Order expires after 15min if unpaid
- [x] Check-in validates QR + prevents duplicate scan
- [x] Staff can only check in events they're assigned to
- [x] Refund releases tickets and updates SoldCount
- [x] Build passes: 0 errors, 0 warnings
- [x] Code review: 4 critical issues identified and fixed

## Code Review Findings (Session 6)

All issues fixed:

1. **Layering violation:** TicketTypeService created to encapsulate TicketType business logic (was in OrderService)
2. **Layering violation:** AdminService created to encapsulate user lock/unlock logic (was in AdminController)
3. **Authorization gap:** Refund endpoint restricted to event organizer only (was missing)
4. **Authorization gap:** Staff listing requires organizer/staff authorization (was public)
5. **Bug:** Webhook body double-read fixed (StreamReader consumed stream, rewind required)
6. **Enhancement:** PageSize capped at 100 in repositories (prevent abuse)
7. **Enhancement:** OrderStatus.Refunded and PaymentStatus.Refunded enum values added

## Risk Assessment

- **Race conditions on ticket quota** — Redis lock mitigates; concurrent order tests passed
- **Mock payment delay** — use `Task.Run` with delay, not blocking; working as designed
- **QR HMAC key rotation** — store key version in QR data for future rotation support

## Security Considerations

- All mutation endpoints require authentication
- Organizer endpoints verify event ownership
- Staff endpoints verify event assignment
- Admin endpoints require Admin role
- Input validation on all DTOs (DataAnnotations)
- Rate limiting on order creation (prevent abuse)
- Refund restricted to organizer (payment authorization)
- Staff listing authorization enforced

## Next Steps

- Phase 4: Frontend Auth & Layout — consumes auth endpoints
- Phase 5: Frontend Marketplace — consumes event, order, ticket APIs
- Phase 6-8: Frontend attendee, organizer, staff/admin pages
- Phase 9: Full integration testing with real workflows
