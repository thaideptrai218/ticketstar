# Phase 7: Controllers & API

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-03-event-service.md](phase-03-event-service.md), [phase-04-order-ticket-service.md](phase-04-order-ticket-service.md), [phase-05-checkin-service.md](phase-05-checkin-service.md)

## Overview
**Priority**: P1 (Public API)
**Status**: Pending
**Effort**: 2 hours

Implement HTTP controllers for Events, Orders, Tickets, and Check-ins. Follow existing AuthController patterns: Result wrapping, pagination, authorization, and proper HTTP status codes.

## Key Insights

- Follow AuthController pattern: `ApiControllerBase`, helper methods for Result handling
- Authorization: `[Authorize]` with role checks
- Pagination: `PaginatedRequest` query parameters
- Error responses: `ApiResponse<T>` wrapper with trace ID
- Rate limiting: Apply to public endpoints

## Requirements

### Functional
1. **EventsController**: CRUD, listing, search, publish
2. **OrdersController**: Create, view my orders, order details
3. **TicketsController**: View my tickets, ticket detail
4. **CheckInController**: Scan QR, get report, manual override

### Non-Functional
- Consistent response format
- Proper HTTP status codes (201, 400, 401, 403, 404, 409, 500)
- Pagination headers (optional for MVP)
- Rate limiting on public endpoints
- OpenAPI documentation

## Architecture

```
HTTP Request → Controller → Service → Repository → DB
                     ↓
               Result<T>
                     ↓
               ApiResponse<T>
```

## Related Code Files

### Create
```
backend/src/TicketStar.API/Controllers/
├── EventsController.cs
├── OrdersController.cs
├── TicketsController.cs
└── CheckInController.cs

backend/src/TicketStar.API/
└── Controllers/
    └── ApiControllerBase.cs (new base class)
```

### Modify
```
backend/src/TicketStar.API/Controllers/AuthController.cs
  - Extract common methods to ApiControllerBase
```

## Implementation Steps

### 7.1 Create ApiControllerBase

- **File**: `backend/src/TicketStar.API/Controllers/ApiControllerBase.cs`
- **Purpose**: Shared helper methods for all controllers
- **Methods**:
  ```csharp
  protected string? GetUserId() => User.FindFirst("sub")?.Value;
  protected string? GetUserRole() => User.FindFirst("role")?.Value;
  protected string GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString();
  protected string GetUserAgent() => Request.Headers["User-Agent"].ToString();
  protected bool IsHttps => Request.IsHttps;

  protected IActionResult FromResult(Result result, string? successMessage = null);
  protected IActionResult FromResult<T>(Result<T> result);
  protected IActionResult NotFoundFromResult(Result result);
  protected IActionResult ConflictFromResult(Result result);
  ```

### 7.2 Refactor AuthController

- **File**: `backend/src/TicketStar.API/Controllers/AuthController.cs`
- **Change**: Inherit from `ApiControllerBase` instead of `ControllerBase`
- **Remove**: Duplicate helper methods

### 7.3 Create EventsController

- **File**: `backend/src/TicketStar.API/Controllers/EventsController.cs`
- **Route**: `api/events`
- **Base**: `ApiControllerBase`

#### Endpoints

```csharp
[HttpGet]
[AllowAnonymous]
[EnableRateLimiting("events-list")]
public async Task<IActionResult> ListPublished(
    [FromQuery] PaginatedRequest request)
    => FromResult(await _eventService.ListPublishedAsync(request));

[HttpGet("{slug}")]
[AllowAnonymous]
public async Task<IActionResult> GetBySlug(string slug)
    => FromResult(await _eventService.GetBySlugAsync(slug));

[HttpGet("my")]
[Authorize]
public async Task<IActionResult> ListMyEvents(
    [FromQuery] PaginatedRequest request)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _eventService.ListMyEventsAsync(userId, request));
}

[HttpPost]
[Authorize(Roles = "Organizer,Admin")]
public async Task<IActionResult> Create([FromBody] CreateEventRequest request)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : CreatedFromResult(await _eventService.CreateAsync(userId, request));
}

[HttpPut("{id}")]
[Authorize(Roles = "Organizer,Admin")]
public async Task<IActionResult> Update(
    Guid id, [FromBody] UpdateEventRequest request)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _eventService.UpdateAsync(userId, id, request));
}

[HttpDelete("{id}")]
[Authorize(Roles = "Organizer,Admin")]
public async Task<IActionResult> Delete(Guid id)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _eventService.DeleteAsync(userId, id));
}

[HttpPost("{id}/publish")]
[Authorize(Roles = "Organizer,Admin")]
public async Task<IActionResult> Publish(Guid id)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _eventService.PublishAsync(userId, id));
}

[HttpPost("{id}/ticket-types")]
[Authorize(Roles = "Organizer,Admin")]
public async Task<IActionResult> AddTicketType(
    Guid id, [FromBody] CreateTicketTypeRequest request)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _eventService.AddTicketTypeAsync(userId, id, request));
}
```

### 7.4 Create OrdersController

- **File**: `backend/src/TicketStar.API/Controllers/OrdersController.cs`
- **Route**: `api/orders`
- **Base**: `ApiControllerBase`

#### Endpoints

```csharp
[HttpPost]
[Authorize]
public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : CreatedFromResult(await _orderService.CreateOrderAsync(userId, request));
}

[HttpGet]
[Authorize]
public async Task<IActionResult> GetMyOrders()
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _orderService.GetMyOrdersAsync(userId, default));
}

[HttpGet("{id}")]
[Authorize]
public async Task<IActionResult> GetOrder(Guid id)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _orderService.GetOrderAsync(userId, id));
}
```

### 7.5 Create TicketsController

- **File**: `backend/src/TicketStar.API/Controllers/TicketsController.cs`
- **Route**: `api/tickets`
- **Base**: `ApiControllerBase`

#### Endpoints

```csharp
[HttpGet("my")]
[Authorize]
public async Task<IActionResult> GetMyTickets()
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _ticketService.GetMyTicketsAsync(userId));
}

[HttpGet("{id}")]
[Authorize]
public async Task<IActionResult> GetTicket(Guid id)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _ticketService.GetTicketAsync(userId, id));
}

[HttpGet("{id}/qr")]
[Authorize]
public async Task<IActionResult> GetTicketQr(Guid id)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _ticketService.GetTicketQrAsync(userId, id));
}
```

### 7.6 Create CheckInController

- **File**: `backend/src/TicketStar.API/Controllers/CheckInController.cs`
- **Route**: `api/checkin`
- **Base**: `ApiControllerBase`

#### Endpoints

```csharp
[HttpPost("scan")]
[Authorize(Roles = "Staff,Organizer,Admin")]
public async Task<IActionResult> ScanQrCode([FromBody] ScanQrRequest request)
{
    var staffId = GetUserId();
    return staffId is null
        ? Unauthorized()
        : FromResult(await _checkInService.ScanQrCodeAsync(staffId, request));
}

[HttpGet("ticket/{id}")]
[Authorize]
public async Task<IActionResult> GetTicketStatus(Guid id)
{
    var userId = GetUserId();
    return userId is null
        ? Unauthorized()
        : FromResult(await _checkInService.GetTicketStatusAsync(userId, id));
}

[HttpGet("event/{eventId}/report")]
[Authorize(Roles = "Staff,Organizer,Admin")]
public async Task<IActionResult> GetCheckInReport(Guid eventId)
{
    var staffId = GetUserId();
    return staffId is null
        ? Unauthorized()
        : FromResult(await _checkInService.GetCheckInReportAsync(staffId, eventId));
}

[HttpPost("manual")]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> ManualCheckIn(
    [FromBody] ManualCheckInRequest request)
{
    var adminId = GetUserId();
    return adminId is null
        ? Unauthorized()
        : FromResult(await _checkInService.ManualCheckInAsync(
            adminId, request.TicketId, request.EventId, request.Reason));
}
```

### 7.7 Add Rate Limiting Policy

- **File**: `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs`
- **Update**: `AddRateLimiting()`
- **Add**:
  ```csharp
  opt.AddPolicy("events-list",
      new RedisRateLimiterPolicy(redis, "events-list",
          permitLimit: 100, window: TimeSpan.FromMinutes(5)));
  opt.AddPolicy("order-create",
      new RedisRateLimiterPolicy(redis, "order-create",
          permitLimit: 10, window: TimeSpan.FromMinutes(5)));
  ```

### 7.8 Update Swagger Documentation

- Add XML comments to controllers
- Add response examples
- Document authentication requirements

## Todo List

- [ ] Create ApiControllerBase with helper methods
- [ ] Refactor AuthController to use ApiControllerBase
- [ ] Create EventsController with all endpoints
- [ ] Create OrdersController with all endpoints
- [ ] Create TicketsController with all endpoints
- [ ] Create CheckInController with all endpoints
- [ ] Add rate limiting policies
- [ ] Add XML documentation comments
- [ ] Add Swagger response examples
- [ ] Test all endpoints with Postman/ Swagger
- [ ] Verify authorization on all endpoints

## Success Criteria

- [ ] All endpoints return consistent ApiResponse format
- [ ] Unauthorized requests return 401
- [ ] Forbidden requests return 403
- [ ] Validation errors return 400
- [ ] Not found returns 404
- [ ] Conflict returns 409
- [ ] Created returns 201 with Location header
- [ ] Public endpoints work without auth
- [ ] Protected endpoints require valid JWT
- [ ] Role-based authorization enforced
- [ ] Rate limiting activates on abuse
- [ ] Swagger UI shows all endpoints
- [ ] Trace ID included in all responses

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Authorization bypass | Critical | Always check GetUserId() on protected endpoints |
| Uncaught exceptions | Medium | GlobalExceptionMiddleware handles |
| Rate limiting bypass | Low | Redis-backed, distributed |
| Swagger exposes too much | Low | Disable in production |

## Security Considerations

- **Authorization**: Every protected endpoint checks GetUserId()
- **Role validation**: Service layer also checks ownership
- **Rate limiting**: Public endpoints limited
- **Input validation**: DTOs with validation attributes
- **CORS**: Configured for frontend origin only
- **HTTPS**: Enforced in production

## Next Steps

- **Phase 8**: MassTransit consumers for notifications
- **Testing**: Integration tests for all endpoints

## Unresolved Questions

1. Should we include pagination headers? (Optional for MVP, add in v2)
2. Swagger enabled in production? (No, disable in non-dev)
3. API versioning? (Not needed for MVP, single version)
