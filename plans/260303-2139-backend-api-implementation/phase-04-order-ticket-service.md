# Phase 4: Order & Ticket Service

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-03-event-service.md](phase-03-event-service.md), [phase-06-external-integration.md](phase-06-external-integration.md)

## Overview
**Priority**: P1 (Core Business)
**Status**: Pending
**Effort**: 3.5 hours

Implement OrderService for ticket purchasing flow: order creation, SePay payment integration, ticket generation with QR codes, and order expiration. Critical distributed locking for ticket quota enforcement.

## Key Insights

- **Order flow**: Create Pending → SePay webhook → Paid → Generate tickets
- **Quota enforcement**: Redis distributed lock per TicketType
- **Idempotency**: SePay webhook may retry; handle duplicate externalRef
- **Expiration**: Pending orders expire after 15 minutes
- **Transaction**: Order + OrderItems + Payment must be atomic
- **QR generation**: Only after payment confirmed

## Requirements

### Functional
1. Create order with multiple ticket types
2. Reserve ticket quota (Redis lock)
3. Generate SePay payment URL (or QR code content)
4. Process SePay webhook (mark paid, generate tickets)
5. Handle order expiration (background job or lazy check)
6. List user orders with status
7. Get order detail with tickets

### Non-Functional
- Distributed lock for quota (Redis)
- Transactional order creation
- Idempotent webhook processing
- QR code generation with HMAC
- Failure handling (lock acquisition failures)

## Architecture

```
OrderController → OrderService → IOrderRepository
                            ↓
                      IDistributedLock (Redis quota lock)
                            ↓
                      ITicketTypeRepository (atomic increment)
                            ↓
                      IQrCodeService (after payment)
                            ↓
                      ITicketRepository (create tickets)
                            ↓
                      IMessageBroker (order confirmation)
```

## Related Code Files

### Create
```
backend/src/TicketStar.Application/
├── Services/
│   └── OrderService.cs
├── Interfaces/
│   └── IOrderService.cs
├── DTOs/
│   └── Orders/
│       ├── CreateOrderRequest.cs
│       ├── CreateOrderItemRequest.cs
│       ├── OrderResponse.cs
│       ├── OrderDetailResponse.cs
│       ├── PaymentResponse.cs
│       ├── SePayWebhookRequest.cs
│       └── GenerateTicketsRequest.cs
└── Common/
    └── OrderErrors.cs (static error messages)
```

### Modify
```
backend/src/TicketStar.Domain/Entities/Order.cs
  - Add const int EXPIRY_MINUTES = 15
```

## Implementation Steps

### 4.1 Define DTOs

#### CreateOrderItemRequest
```csharp
public record CreateOrderItemRequest(
    Guid TicketTypeId,
    int Quantity
);
```

#### CreateOrderRequest
```csharp
public record CreateOrderRequest(
    List<CreateOrderItemRequest> Items
);
```

#### OrderResponse
```csharp
public record OrderResponse(
    Guid Id,
    OrderStatus Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime? ExpiresAt,
    DateTime? PaidAt,
    string? PaymentUrl,
    List<OrderItemResponse> Items
);
```

#### OrderDetailResponse
```csharp
public record OrderDetailResponse(
    Guid Id,
    OrderStatus Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime? ExpiresAt,
    DateTime? PaidAt,
    PaymentResponse? Payment,
    List<OrderItemResponse> Items,
    List<TicketResponse>? Tickets // Only if Paid
);
```

#### TicketResponse
```csharp
public record TicketResponse(
    Guid Id,
    string QrCodeBase64,
    string TicketTypeName,
    string EventTitle,
    DateTime EventStartAt,
    string? Venue,
    bool IsCheckedIn
);
```

### 4.2 Create IOrderService Interface
- **File**: `backend/src/TicketStar.Application/Interfaces/IOrderService.cs`
- **Methods**:
  ```csharp
  Task<Result<OrderResponse>> CreateOrderAsync(string userId, CreateOrderRequest request);
  Task<Result<OrderDetailResponse>> GetOrderAsync(string userId, Guid orderId);
  Task<Result<List<OrderResponse>>> GetMyOrdersAsync(string userId, CancellationToken ct);
  Task<Result> ProcessSePayWebhookAsync(string jsonPayload, string signature);
  Task<Result> GenerateTicketsAsync(Guid orderId);
  Task CleanupExpiredOrdersAsync(CancellationToken ct);
  ```

### 4.3 Implement OrderService
- **File**: `backend/src/TicketStar.Application/Services/OrderService.cs`
- **Dependencies**:
  - `IOrderRepository`
  - `ITicketTypeRepository`
  - `ITicketRepository`
  - `IPaymentRepository`
  - `IUnitOfWork`
  - `IDistributedLock`
  - `IQrCodeService`
  - `ISePayWebhookHandler`
  - `IBus` (MassTransit)
  - `ILogger<OrderService>`

### 4.4 Implement CreateOrderAsync
1. Validate all items have Quantity > 0
2. Get all TicketTypes by ID, validate exist and on sale (SaleStartAt/EndAt)
3. Calculate total amount: sum(TicketType.Price * Quantity)
4. **Distributed lock**: For each TicketType, acquire lock `ticket:quota:{id}:lock`
   - If lock fails, return error "Ticket type unavailable"
5. Validate quota: TicketType.Quota - TicketType.SoldCount >= Quantity
6. Create Order with Status = Pending, ExpiresAt = UtcNow + 15min
7. Create OrderItems with snapshot UnitPrice
8. Save in transaction
9. Release all locks
10. **SePay integration**: Generate payment URL/QR content
11. Return OrderResponse with payment URL

### 4.5 Implement SePay URL Generation
- SePay format: `https://qr.sepay.vn/{amount}?content={orderRef}`
- Order reference: `TS-{orderId}` (TicketStar prefix)
- Store this in Payment.ExternalRef field for webhook matching

### 4.6 Implement ProcessSePayWebhookAsync
1. Validate signature using `ISePayWebhookHandler`
2. Parse payload to get `gateway_transaction_id` and `content`
3. Extract order reference from content (parse `TS-{orderId}`)
4. Get order by extracted ID, validate Status == Pending
5. Validate amount matches (security check)
6. **Idempotency**: Check if Payment already exists with this externalRef
7. Create Payment entity with Status = Success
8. Update Order: Status = Paid, PaidAt = UtcNow
9. **Generate tickets** (see 4.7)
10. Publish `OrderConfirmedMessage` to RabbitMQ
11. Return success

### 4.7 Implement GenerateTicketsAsync
1. Get order with OrderItems.TicketType
2. Validate Status == Paid and no tickets exist
3. For each OrderItem:
   - Loop `item.Quantity` times
   - Create Ticket entity
   - Generate QR payload: `{ticketId}|{eventId}|{userId}|{UtcNow:O}`
   - Generate HMAC signature
   - Store `QrCode = payload|{signature}`
   - Increment TicketType.SoldCount (atomic SQL)
4. Save all tickets
5. Invalidate event cache

### 4.8 Implement GetOrderAsync
1. Get order by ID with includes
2. Authorization: userId == order.UserId OR Admin
3. If Paid, include tickets
4. Project to OrderDetailResponse

### 4.9 Implement GetMyOrdersAsync
1. Query by userId, order by CreatedAt desc
2. Include OrderItems.TicketType.Event
3. Project to OrderResponse

### 4.10 Implement CleanupExpiredOrdersAsync
1. Query: Status == Pending && ExpiresAt < UtcNow
2. For each expired order:
   - Optionally mark Status = Expired
   - Don't delete (keep for audit)
3. Call from hosted service (Phase 8) or manually

### 4.11 Error Handling
- **Lock acquisition failure**: Return "Ticket type temporarily unavailable"
- **Quota exceeded**: Return "Not enough tickets available"
- **Event not published**: Return "Event not available for purchase"
- **Invalid signature**: Log warning, return success (to avoid SePay retry loop)
- **Amount mismatch**: Log error, alert admin, don't mark paid

## Todo List

- [ ] Create Order DTOs (Request/Response)
- [ ] Create IOrderService interface
- [ ] Implement OrderService.CreateOrderAsync with Redis locks
- [ ] Implement SePay URL generation
- [ ] Implement ProcessSePayWebhookAsync with idempotency
- [ ] Implement GenerateTicketsAsync with QR codes
- [ ] Implement GetOrderAsync with auth check
- [ ] Implement GetMyOrdersAsync
- [ ] Implement CleanupExpiredOrdersAsync
- [ ] Add distributed lock helpers
- [ ] Add quota validation logic
- [ ] Add atomic SoldCount increment
- [ ] Register OrderService in DI
- [ ] Add validation attributes to DTOs

## Success Criteria

- [ ] Order creates with Pending status
- [ ] Redis lock prevents overselling
- [ ] Multiple users can buy different ticket types concurrently
- [ ] SePay webhook marks order Paid
- [ ] Tickets generated with valid QR codes
- [ ] QR code HMAC validates correctly
- [ ] Idempotent webhook (no duplicate tickets on retry)
- [ ] Expired orders can be cleaned up
- [ ] Order total calculated correctly
- [ ] Event cache invalidated after purchase

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition on quota | Critical | Redis distributed lock |
| Webhook replay attack | High | Idempotency by externalRef |
| Lock held too long | Medium | Lock timeout 10s, release in finally |
| QR code forgery | High | HMAC with secret key |
| SePay downtime | Medium | Log webhook, manual reconcile |

## Security Considerations

- **Amount validation**: Always compare webhook amount vs order total
- **Signature validation**: Reject webhook without valid signature
- **Authorization**: Only order owner can view details
- **Lock timeout**: Prevent deadlock if service crashes
- **QR expiry**: Include timestamp, validate on scan (Phase 5)
- **Payment URL**: Use HTTPS, include order ID only (no user data)

## Next Steps

- **Phase 5**: CheckInService validates QR codes
- **Phase 6**: SePay webhook controller integration
- **Phase 7**: OrdersController exposes HTTP endpoints

## Unresolved Questions

1. SePay callback URL format? (Need from docs: `/api/webhooks/sepay`)
2. Should we hold lock during payment? (No, only during order creation)
3. Ticket refund policy? (Not in MVP, defer to Phase 10)
4. Order expiration: background job vs lazy? (Lazy on next order creation is simpler)
