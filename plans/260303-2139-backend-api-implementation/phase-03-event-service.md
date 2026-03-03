# Phase 3: Event Service

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-02-domain-repositories.md](phase-02-domain-repositories.md), [phase-04-order-ticket-service.md](phase-04-order-ticket-service.md)

## Overview
**Priority**: P1 (Core Business)
**Status**: Pending
**Effort**: 2.5 hours

Implement EventService for CRUD operations, slug generation, cache integration, and authorization enforcement. Organizers create/manage events; public users browse published events.

## Key Insights

- Events belong to organizers (UserRole.Organizer or Admin)
- Slug must be unique per organizer or globally (recommend global)
- Cache event listings (TTL 5 min) and details (TTL 10 min)
- Status flow: Draft → Published → Cancelled
- Validation: EndAt > StartAt, at least one TicketType
- Soft delete pattern from User entity

## Requirements

### Functional
1. Create event with ticket types (transactional)
2. Update event (only by owner or admin)
3. Delete/cancel event
4. Publish draft event
5. List published events (paginated, searchable)
6. Get event by slug (public detail view)
7. Organizer dashboard (own events only)

### Non-Functional
- Cache-aside pattern for listings and details
- Authorization: Owner, Admin, or public (read-only)
- Slug uniqueness validation
- Transaction: Event + TicketTypes created atomically

## Architecture

```
EventsController → EventService → IEventRepository
                            ↓
                      CacheService (Redis)
                            ↓
                      ITicketTypeRepository
```

## Related Code Files

### Create
```
backend/src/TicketStar.Application/
├── Services/
│   └── EventService.cs
├── Interfaces/
│   └── IEventService.cs
└── DTOs/
    └── Events/
        ├── CreateEventRequest.cs
        ├── UpdateEventRequest.cs
        ├── EventResponse.cs
        ├── EventListItemResponse.cs
        ├── PublishEventRequest.cs
        ├── CreateTicketTypeRequest.cs
        └── UpdateTicketTypeRequest.cs
```

### Modify
```
backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs
backend/src/TicketStar.Application/Common/ResultError.cs (add Conflict, NotFound)
```

## Implementation Steps

### 3.1 Define DTOs

#### CreateEventRequest
```csharp
public record CreateEventRequest(
    string Title,
    string? Description,
    DateTime StartAt,
    DateTime EndAt,
    string? Venue,
    string? ImageUrl,
    List<CreateTicketTypeRequest> TicketTypes
);
```

#### UpdateEventRequest
```csharp
public record UpdateEventRequest(
    string? Title,
    string? Description,
    DateTime? StartAt,
    DateTime? EndAt,
    string? Venue,
    string? ImageUrl
);
```

#### EventResponse
```csharp
public record EventResponse(
    Guid Id,
    string Slug,
    string Title,
    string? Description,
    DateTime StartAt,
    DateTime EndAt,
    string? Venue,
    EventStatus Status,
    string? ImageUrl,
    string OrganizerName,
    List<TicketTypeResponse> TicketTypes,
    int TotalTickets,
    int SoldTickets,
    DateTime CreatedAt
);
```

#### EventListItemResponse
```csharp
public record EventListItemResponse(
    Guid Id,
    string Slug,
    string Title,
    string? ImageUrl,
    DateTime StartAt,
    string? Venue,
    EventStatus Status,
    int MinPrice,
    int MaxPrice,
    int TotalTickets,
    int SoldTickets
);
```

### 3.2 Create IEventService Interface
- **File**: `backend/src/TicketStar.Application/Interfaces/IEventService.cs`
- **Methods**:
  ```csharp
  Task<Result<EventResponse>> CreateAsync(string organizerId, CreateEventRequest request);
  Task<Result<EventResponse>> UpdateAsync(string userId, Guid eventId, UpdateEventRequest request);
  Task<Result> DeleteAsync(string userId, Guid eventId);
  Task<Result<EventResponse>> PublishAsync(string userId, Guid eventId);
  Task<Result<EventResponse>> GetBySlugAsync(string slug);
  Task<Result<PaginatedResponse<EventListItemResponse>>> ListPublishedAsync(PaginatedRequest request);
  Task<Result<PaginatedResponse<EventListItemResponse>>> ListMyEventsAsync(string organizerId, PaginatedRequest request);
  Task<Result> AddTicketTypeAsync(string userId, Guid eventId, CreateTicketTypeRequest request);
  Task<Result> UpdateTicketTypeAsync(string userId, Guid ticketTypeId, UpdateTicketTypeRequest request);
  Task<Result> DeleteTicketTypeAsync(string userId, Guid ticketTypeId);
  ```

### 3.3 Implement EventService
- **File**: `backend/src/TicketStar.Application/Services/EventService.cs`
- **Dependencies**:
  - `IEventRepository`
  - `ITicketTypeRepository`
  - `IUnitOfWork`
  - `IRedisService` (for cache)
  - `ILogger<EventService>`

### 3.4 Implement CreateAsync
1. Validate StartAt < EndAt
2. Validate at least one ticket type with price >= 0 and quota > 0
3. Generate slug: title slugify + random suffix (6 chars) for uniqueness
4. Create Event entity with Status = Draft
5. Create TicketType entities
6. Save in transaction
7. Invalidate event list cache

### 3.5 Implement UpdateAsync
1. Get event by ID
2. Authorization: userId == organizerId OR role == Admin
3. Update fields (null = no change)
4. Validate StartAt < EndAt if both provided
5. Don't allow status change here (use PublishAsync)
6. Save + invalidate cache

### 3.6 Implement DeleteAsync
1. Get event by ID
2. Authorization: userId == organizerId OR role == Admin
3. Soft delete: set DeletedAt (or reuse User.IsDeleted pattern)
4. Invalidate cache

### 3.7 Implement PublishAsync
1. Get event by ID with TicketTypes
2. Authorization: owner or admin
3. Validate: at least one ticket type, all quotas > 0, StartAt > UtcNow
4. Change status: Draft → Published
5. Save + invalidate cache

### 3.8 Implement GetBySlugAsync
1. Check cache first: `event:detail:{slug}`
2. Cache miss: query DB with includes (TicketTypes, Organizer.Profile)
3. Calculate: MinPrice, MaxPrice, TotalTickets, SoldTickets
4. Set cache with TTL 10min
5. Return EventResponse

### 3.9 Implement ListPublishedAsync
1. Check cache: `event:list:{page}:{pageSize}:{search?}`
2. Cache miss: query DB where Status == Published
3. Order by StartAt asc, then CreatedAt desc
4. Apply pagination + search filter (Title or Venue)
5. Project to EventListItemResponse
6. Set cache TTL 5min

### 3.10 Implement ListMyEventsAsync
1. No caching (organizer-specific, low volume)
2. Query where OrganizerId == userId
3. Include all statuses (Draft, Published, Cancelled)
4. Pagination

### 3.11 Implement TicketType CRUD
- **AddTicketTypeAsync**: Create + associate with event, validate owner
- **UpdateTicketTypeAsync**: Validate owner, don't change SoldCount, validate quota >= SoldCount
- **DeleteTicketTypeAsync**: Only if SoldCount == 0, validate owner

### 3.12 Helper Methods
- **Slugify**: `title.ToLower()` + replace spaces with hyphens + remove special chars
- **Uniqueness**: Append random 6-char suffix, check DB, retry if collision
- **Authorization**: Private method `IsOwnerOrAdmin(string userId, Event evt, UserRole role)`

## Todo List

- [ ] Create Event DTOs (Request/Response)
- [ ] Create TicketType DTOs
- [ ] Create IEventService interface
- [ ] Implement EventService.CreateAsync with slug generation
- [ ] Implement EventService.UpdateAsync with authorization
- [ ] Implement EventService.DeleteAsync (soft delete)
- [ ] Implement EventService.PublishAsync with validation
- [ ] Implement EventService.GetBySlugAsync with cache
- [ ] Implement EventService.ListPublishedAsync with cache
- [ ] Implement EventService.ListMyEventsAsync
- [ ] Implement AddTicketTypeAsync
- [ ] Implement UpdateTicketTypeAsync
- [ ] Implement DeleteTicketTypeAsync
- [ ] Add cache invalidation helpers
- [ ] Register EventService in DI
- [ ] Add validation attributes to DTOs

## Success Criteria

- [ ] Create event with ticket types succeeds
- [ ] Slug is unique and URL-safe
- [ ] Only owner/admin can update/delete
- [ ] Published events appear in public listing
- [ ] Draft events only visible to organizer
- [ ] Cache hit on repeated detail view
- [ ] Pagination returns correct page/size
- [ ] Search filters by title/venue
- [ ] Ticket types cannot be deleted if sold > 0

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slug collision | Low | Random suffix + retry on collision |
| Cache staleness | Medium | Invalidate on all mutations |
| Ticket quota undercut | High | Validate quota >= SoldCount on update |
| Publish with invalid dates | Medium | Validate StartAt > UtcNow |

## Security Considerations

- **Authorization**: Every mutation checks ownership or Admin role
- **Slug injection**: Sanitize special chars, max length 100
- **XSS**: Escape Description in responses (ASP.NET auto-escapes)
- **Cache poisoning**: Never cache user-specific data
- **DoS**: Rate limit listing endpoints (existing Redis rate limiter)

## Next Steps

- **Phase 4**: OrderService creates tickets using EventService validation
- **Phase 7**: EventsController exposes HTTP endpoints

## Unresolved Questions

1. Should organizers edit published events? (Yes, but restrict quota decrease)
2. Event image upload size limit? (Max 5MB, store URL only for MVP)
3. Search full-text vs LIKE? (LIKE is fine for MVP <10K events)
