# Phase 2: Domain & Repositories

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-01-infrastructure-setup.md](phase-01-infrastructure-setup.md), [phase-03-event-service.md](phase-03-event-service.md)

## Overview
**Priority**: P0 (Blocking)
**Status**: Pending
**Effort**: 2 hours

Create repository interfaces and implementations for Event, TicketType, Order, OrderItem, Ticket, Payment, CheckIn, and StaffAssignment entities. Extend existing generic repository pattern with domain-specific queries.

## Key Insights

- Entities already exist with EF configurations
- Generic `IRepository<T>` and `EfRepository<T>` exist - use as base
- Need specific query methods (e.g., `GetBySlugAsync`, `GetSoldCountAsync`)
- Pagination support needed for event listings
- Existing auth repos show the pattern to follow

## Requirements

### Functional
1. Repository interfaces for all business entities
2. Domain-specific query methods (avoid raw SQL where possible)
3. Pagination support with `PaginatedRequest`
4. Include patterns for related entities (Event.TicketTypes, etc.)

### Non-Functional
- Async operations throughout
- IQueryable for complex queries (defer to service layer)
- Follow existing auth repository patterns
- EF Core navigation properties over raw joins

## Architecture

```
IEventRepository          ITicketTypeRepository     IOrderRepository
├── GetByIdAsync          ├── GetByIdAsync          ├── GetByIdAsync
├── GetBySlugAsync        ├── GetByEventAsync       ├── GetByUserAsync
├── ListPaginatedAsync    ├── GetSoldCountAsync     ├── GetPendingExpiredAsync
├── GetByOrganizerAsync   └── UpdateSoldCountAsync  └── CreateWithItemsAsync
└── SearchAsync
└── UpdateAsync

ITicketRepository         ICheckInRepository        IStaffAssignmentRepository
├── GetByIdAsync          ├── GetByTicketAsync      ├── GetByEventAsync
├── GetByOrderAsync       ├── GetByEventAsync       ├── GetByStaffAsync
├── GetByUserAsync        └── CreateAsync           └── AssignAsync
└── UpdateCheckedInAsync
```

## Related Code Files

### Create
```
backend/src/TicketStar.Domain/Interfaces/
├── IEventRepository.cs
├── ITicketTypeRepository.cs
├── IOrderRepository.cs
├── ITicketRepository.cs
├── IPaymentRepository.cs
├── ICheckInRepository.cs
└── IStaffAssignmentRepository.cs

backend/src/TicketStar.Infrastructure/Repositories/
├── EventRepository.cs
├── TicketTypeRepository.cs
├── OrderRepository.cs
├── TicketRepository.cs
├── PaymentRepository.cs
├── CheckInRepository.cs
└── StaffAssignmentRepository.cs
```

### Modify
```
backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs
  - AddRepositories() method extension
```

## Implementation Steps

### 2.1 Create IEventRepository
- **File**: `backend/src/TicketStar.Domain/Interfaces/IEventRepository.cs`
- **Methods**:
  ```csharp
  Task<Event?> GetBySlugAsync(string slug, CancellationToken ct);
  Task<List<Event>> GetByOrganizerAsync(string organizerId, CancellationToken ct);
  Task<PaginatedResponse<Event>> ListPaginatedAsync(PaginatedRequest request, CancellationToken ct);
  Task<List<Event>> SearchAsync(string query, CancellationToken ct);
  Task<bool> SlugExistsAsync(string slug, CancellationToken ct);
  ```

### 2.2 Create ITicketTypeRepository
- **File**: `backend/src/TicketStar.Domain/Interfaces/ITicketTypeRepository.cs`
- **Methods**:
  ```csharp
  Task<List<TicketType>> GetByEventAsync(Guid eventId, CancellationToken ct);
  Task<int> GetSoldCountAsync(Guid ticketTypeId, CancellationToken ct);
  Task IncrementSoldCountAsync(Guid ticketTypeId, int quantity, CancellationToken ct);
  Task<bool> IsAvailableAsync(Guid ticketTypeId, int quantity, CancellationToken ct);
  ```

### 2.3 Create IOrderRepository
- **File**: `backend/src/TicketStar.Domain/Interfaces/IOrderRepository.cs`
- **Methods**:
  ```csharp
  Task<List<Order>> GetByUserAsync(string userId, CancellationToken ct);
  Task<Order?> GetByIdWithItemsAsync(Guid orderId, CancellationToken ct);
  Task<List<Order>> GetPendingExpiredAsync(CancellationToken ct);
  Task<Order?> GetByExternalRefAsync(string externalRef, CancellationToken ct);
  ```

### 2.4 Create ITicketRepository
- **File**: `backend/src/TicketStar.Domain/Interfaces/ITicketRepository.cs`
- **Methods**:
  ```csharp
  Task<List<Ticket>> GetByUserAsync(string userId, CancellationToken ct);
  Task<List<Ticket>> GetByOrderAsync(Guid orderId, CancellationToken ct);
  Task<Ticket?> GetByQrCodeAsync(string qrCode, CancellationToken ct);
  Task<List<Ticket>> GetByEventAsync(Guid eventId, CancellationToken ct);
  Task UpdateCheckedInAsync(Guid ticketId, bool isCheckedIn, CancellationToken ct);
  ```

### 2.5 Create IPaymentRepository
- **File**: `backend/src/TicketStar.Domain/Interfaces/IPaymentRepository.cs`
- **Methods**:
  ```csharp
  Task<Payment?> GetByOrderAsync(Guid orderId, CancellationToken ct);
  Task<Payment?> GetByExternalRefAsync(string externalRef, CancellationToken ct);
  ```

### 2.6 Create ICheckInRepository
- **File**: `backend/src/TicketStar.Domain/Interfaces/ICheckInRepository.cs`
- **Methods**:
  ```csharp
  Task<CheckIn?> GetByTicketAsync(Guid ticketId, CancellationToken ct);
  Task<List<CheckIn>> GetByEventAsync(Guid eventId, CancellationToken ct);
  Task<int> GetCheckInCountAsync(Guid eventId, CancellationToken ct);
  ```

### 2.7 Create IStaffAssignmentRepository
- **File**: `backend/src/TicketStar.Domain/Interfaces/IStaffAssignmentRepository.cs`
- **Methods**:
  ```csharp
  Task<List<StaffAssignment>> GetByEventAsync(Guid eventId, CancellationToken ct);
  Task<List<StaffAssignment>> GetByStaffAsync(string staffId, CancellationToken ct);
  Task<bool> IsAssignedAsync(string staffId, Guid eventId, CancellationToken ct);
  ```

### 2.8 Implement EventRepository
- **File**: `backend/src/TicketStar.Infrastructure/Repositories/EventRepository.cs`
- **Base**: `EfRepository<Event>`
- **Key implementation notes**:
  - `ListPaginatedAsync`: Use Skip/Take with OrderBy
  - `SearchAsync`: Use EF.Functions.Like or Contains
  - Include `TicketTypes` for detail queries

### 2.9 Implement TicketTypeRepository
- **File**: `backend/src/TicketStar.Infrastructure/Repositories/TicketTypeRepository.cs`
- **Base**: `EfRepository<TicketType>`
- **Concurrency**: Use `SoldCount` field directly (no RowVersion needed)
- **Atomic increment**: Use raw SQL `UPDATE ... SET SoldCount = SoldCount + @qty`

### 2.10 Implement OrderRepository
- **File**: `backend/src/TicketStar.Infrastructure/Repositories/OrderRepository.cs`
- **Base**: `EfRepository<Order>`
- **Include**: `Items`, `Items.TicketType`, `Payment`, `User`
- **Expired query**: `Status == Pending && ExpiresAt < UtcNow`

### 2.11 Implement TicketRepository
- **File**: `backend/src/TicketStar.Infrastructure/Repositories/TicketRepository.cs`
- **Base**: `EfRepository<Ticket>`
- **Include**: `OrderItem`, `OrderItem.Order`, `TicketType`, `Event`, `CheckIn`
- **QR lookup**: Add index on `QrCode` column in configuration

### 2.12 Implement PaymentRepository
- **File**: `backend/src/TicketStar.Infrastructure/Repositories/PaymentRepository.cs`
- **Base**: `EfRepository<Payment>`
- **Webhook lookup**: By `ExternalRef` (SePay transaction ID)

### 2.13 Implement CheckInRepository
- **File**: `backend/src/TicketStar.Infrastructure/Repositories/CheckInRepository.cs`
- **Base**: `EfRepository<CheckIn>`
- **Include**: `Ticket`, `Ticket.User`, `Scanner`, `Event`

### 2.14 Implement StaffAssignmentRepository
- **File**: `backend/src/TicketStar.Infrastructure/Repositories/StaffAssignmentRepository.cs`
- **Base**: `EfRepository<StaffAssignment>`
- **Include**: `User`, `Event`, `Assigner`

### 2.15 Register Repositories
- **File**: `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs`
- **Update**: `AddRepositories()` method
- **Add**:
  ```csharp
  services.AddScoped<IEventRepository, EventRepository>();
  services.AddScoped<ITicketTypeRepository, TicketTypeRepository>();
  services.AddScoped<IOrderRepository, OrderRepository>();
  services.AddScoped<ITicketRepository, TicketRepository>();
  services.AddScoped<IPaymentRepository, PaymentRepository>();
  services.AddScoped<ICheckInRepository, CheckInRepository>();
  services.AddScoped<IStaffAssignmentRepository, StaffAssignmentRepository>();
  ```

### 2.16 Add QrCode Index
- **File**: `backend/src/TicketStar.Infrastructure/Data/Configurations/TicketConfiguration.cs`
- **Add**: `builder.HasIndex(t => t.QrCode).IsUnique();`

## Todo List

- [ ] Create `IEventRepository` interface
- [ ] Create `ITicketTypeRepository` interface
- [ ] Create `IOrderRepository` interface
- [ ] Create `ITicketRepository` interface
- [ ] Create `IPaymentRepository` interface
- [ ] Create `ICheckInRepository` interface
- [ ] Create `IStaffAssignmentRepository` interface
- [ ] Implement `EventRepository` with pagination
- [ ] Implement `TicketTypeRepository` with atomic increment
- [ ] Implement `OrderRepository` with includes
- [ ] Implement `TicketRepository` with QR lookup
- [ ] Implement `PaymentRepository`
- [ ] Implement `CheckInRepository`
- [ ] Implement `StaffAssignmentRepository`
- [ ] Add QR code index in TicketConfiguration
- [ ] Register all repositories in DI
- [ ] Test repository methods compile

## Success Criteria

- [ ] All repository interfaces defined
- [ ] All repository implementations compile
- [ ] Pagination works for event listing
- [ ] Atomic ticket increment doesn't race
- [ ] QR code index added for fast lookup
- [ ] `dotnet build` succeeds
- [ ] DI registration complete

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition on SoldCount | High | Use raw SQL atomic increment |
| Pagination performance at scale | Medium | Add indexed columns (CreatedAt, Title) |
| QR code collision | Low | Unique index on QrCode column |
| N+1 queries with includes | Medium | Use SplitQuery for complex includes |

## Security Considerations

- **User isolation**: All queries by userId include explicit filter
- **Organizer isolation**: Events filtered by organizerId
- **Staff validation**: Check assignment before allowing operations
- **Slug uniqueness**: Prevent duplicate slugs per organizer

## Next Steps

- **Phase 3**: EventService uses IEventRepository
- **Phase 4**: OrderService uses IOrderRepository, ITicketTypeRepository
- **Phase 5**: CheckInService uses ICheckInRepository, IStaffAssignmentRepository

## Unresolved Questions

1. Should we use SplitQuery for Order.OrderItems.Tickets? (Yes - avoid Cartesian explosion)
2. Pagination cursor vs offset? (Offset is fine for MVP <10K events)
3. Soft delete for events? (Yes - reuse User soft delete pattern)
