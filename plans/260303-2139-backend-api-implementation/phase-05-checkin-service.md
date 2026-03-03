# Phase 5: Check-In Service

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-04-order-ticket-service.md](phase-04-order-ticket-service.md), [phase-07-controllers-api.md](phase-07-controllers-api.md)

## Overview
**Priority**: P1 (Core Business)
**Status**: Pending
**Effort**: 2 hours

Implement CheckInService for QR code validation, attendee check-in, and staff authorization. Staff scan QR codes at event entry; system validates ticket authenticity and prevents duplicate check-ins.

## Key Insights

- **QR format**: `ticketId|eventId|userId|timestamp|hmac`
- **Validation**: HMAC verification + ticket ownership + event match
- **Authorization**: Only assigned staff can check in for an event
- **Idempotency**: Same ticket can be scanned multiple times (return current status)
- **Audit trail**: Every scan attempt logged (even failed)
- **Offline support**: Staff can view assigned events, check-ins cached

## Requirements

### Functional
1. Validate QR code (HMAC, format, expiry)
2. Check in ticket by QR code
3. Get ticket status (for re-scanning)
4. Get event check-in report
5. Validate staff assignment
6. Manual override (admin only)

### Non-Functional
- QR validation < 100ms (cached lookups)
- Idempotent check-in (no-op if already checked in)
- Full audit trail
- Staff authorization per event

## Architecture

```
CheckInController → CheckInService → ITicketRepository
                            ↓
                      IQrCodeService (validate)
                            ↓
                      ICheckInRepository
                            ↓
                      IStaffAssignmentRepository (auth)
                            ↓
                      IMessageBroker (notify)
```

## Related Code Files

### Create
```
backend/src/TicketStar.Application/
├── Services/
│   └── CheckInService.cs
├── Interfaces/
│   └── ICheckInService.cs
└── DTOs/
    └── CheckIns/
        ├── ScanQrRequest.cs
        ├── ScanQrResponse.cs
        ├── TicketStatusResponse.cs
        ├── CheckInReportResponse.cs
        └── CheckInSummaryResponse.cs
```

## Implementation Steps

### 5.1 Define DTOs

#### ScanQrRequest
```csharp
public record ScanQrRequest(
    string QrCode,
    Guid EventId
);
```

#### ScanQrResponse
```csharp
public record ScanQrResponse(
    bool Success,
    string Message,
    TicketStatusResponse? Ticket,
    DateTime ScannedAt
);
```

#### TicketStatusResponse
```csharp
public record TicketStatusResponse(
    Guid TicketId,
    string TicketTypeName,
    string AttendeeName,
    string AttendeeEmail,
    bool IsCheckedIn,
    DateTime? CheckedInAt,
    string? CheckedInBy
);
```

#### CheckInReportResponse
```csharp
public record CheckInReportResponse(
    Guid EventId,
    string EventTitle,
    int TotalTickets,
    int CheckedIn,
    int Pending,
    List<CheckInRecordResponse> RecentCheckIns
);
```

#### CheckInRecordResponse
```csharp
public record CheckInRecordResponse(
    Guid TicketId,
    string AttendeeName,
    DateTime CheckedInAt,
    string CheckedInBy
);
```

### 5.2 Create ICheckInService Interface
- **File**: `backend/src/TicketStar.Application/Interfaces/ICheckInService.cs`
- **Methods**:
  ```csharp
  Task<Result<ScanQrResponse>> ScanQrCodeAsync(string staffId, ScanQrRequest request);
  Task<Result<TicketStatusResponse>> GetTicketStatusAsync(string userId, Guid ticketId);
  Task<Result<CheckInReportResponse>> GetCheckInReportAsync(string staffId, Guid eventId);
  Task<Result> ManualCheckInAsync(string adminId, Guid ticketId, Guid eventId, string reason);
  Task<bool> CanCheckInEventAsync(string staffId, Guid eventId);
  ```

### 5.3 Implement CheckInService
- **File**: `backend/src/TicketStar.Application/Services/CheckInService.cs`
- **Dependencies**:
  - `ITicketRepository`
  - `ICheckInRepository`
  - `IStaffAssignmentRepository`
  - `IQrCodeService`
  - `IBus` (MassTransit)
  - `ILogger<CheckInService>`

### 5.4 Implement ScanQrCodeAsync
1. **Parse QR code**: Split by `|`, extract ticketId, eventId, userId, timestamp, hmac
2. **Validate format**: Must have 5 parts
3. **Validate HMAC**: Recompute HMAC, compare with provided
4. **Validate expiry**: timestamp < event.StartAt + 24h
5. **Get ticket**: By ID, with includes (Event, User, OrderItem.TicketType)
6. **Validate event**: qr.EventId == request.EventId
7. **Authorize staff**: `CanCheckInEventAsync(staffId, eventId)`
8. **Check existing**: If already checked in, return status (idempotent)
9. **Create CheckIn**: ScannedAt = UtcNow, ScannedBy = staffId
10. **Update ticket**: IsCheckedIn = true
11. **Save transaction**
12. **Publish message**: `TicketCheckedInMessage`
13. **Return response**

### 5.5 Implement ValidateQrCodeAsync (private)
1. **Format check**: Split by `|`, expect 5 parts
2. **HMAC verification**: Compute HMAC of payload, compare
3. **Timestamp check**: Parse timestamp, validate not expired
4. **Ticket lookup**: By ticketId from QR
5. **Event match**: qr.EventId == ticket.EventId
6. **User match**: qr.UserId == ticket.UserId
7. Return `Result<QrValidationResult>` with detailed errors

### 5.6 Implement GetTicketStatusAsync
1. Authorization: userId == ticket.UserId OR Admin OR assigned staff
2. Get ticket with includes
3. Get CheckIn if exists
4. Return TicketStatusResponse

### 5.7 Implement GetCheckInReportAsync
1. Authorize staff: CanCheckInEventAsync
2. Get event with all tickets
3. Count: Total, CheckedIn, Pending
4. Get recent check-ins (last 100, ordered by ScannedAt desc)
5. Return CheckInReportResponse

### 5.8 Implement CanCheckInEventAsync
1. Check if user has role: Admin, Organizer, or Staff
2. If Admin/Organizer: return true (full access)
3. If Staff: Check `IStaffAssignmentRepository.IsAssignedAsync`
4. Return result

### 5.9 Implement ManualCheckInAsync (Admin only)
1. Authorize: Admin role only
2. Get ticket by ID
3. Validate: ticket.EventId == eventId
4. Create CheckIn with admin notes
5. Update ticket
6. Publish message
7. Return success

### 5.10 Error Messages
- `"Invalid QR code format"` - malformed QR
- `"QR code signature invalid"` - HMAC mismatch
- `"Ticket not found"` - invalid ticketId
- `"Ticket belongs to different event"` - eventId mismatch
- `"Ticket already checked in"` - idempotent, return status
- `"You are not authorized to check in this event"` - staff not assigned
- `"Event not found"` - invalid eventId

## Todo List

- [ ] Create CheckIn DTOs
- [ ] Create ICheckInService interface
- [ ] Implement CheckInService.ScanQrCodeAsync
- [ ] Implement QR validation logic (HMAC, format, expiry)
- [ ] Implement GetTicketStatusAsync
- [ ] Implement GetCheckInReportAsync
- [ ] Implement CanCheckInEventAsync
- [ ] Implement ManualCheckInAsync
- [ ] Add staff authorization checks
- [ ] Add audit logging for all scans
- [ ] Register CheckInService in DI
- [ ] Add validation attributes to DTOs

## Success Criteria

- [ ] Valid QR code checks in successfully
- [ ] Invalid HMAC rejected with clear error
- [ ] Duplicate scan returns current status (idempotent)
- [ ] Only assigned staff can check in
- [ ] Admin can manually check in any ticket
- [ ] Check-in report shows accurate counts
- [ ] Audit trail created for every scan
- [ ] RabbitMQ message published on check-in
- [ ] QR timestamp validated (not expired)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| QR code forgery | High | HMAC with secret key |
| Staff authorization bypass | High | Check assignment on every scan |
| Duplicate check-in | Low | IsCheckedIn flag + unique constraint |
| QR replay attack | Low | Timestamp expiry (event + 24h) |
| Offline check-in failure | Medium | Cache event staff assignments |

## Security Considerations

- **HMAC secret**: Same as QR generation, must match
- **Timestamp validation**: Prevent replay of old QR codes
- **Authorization**: Always validate staff assignment
- **Audit log**: Never delete check-in records
- **Rate limiting**: Prevent scan spam (existing Redis limiter)
- **Admin override**: Require explicit reason, log separately

## Next Steps

- **Phase 7**: CheckInController exposes HTTP endpoints
- **Phase 8**: RabbitMQ consumer for check-in notifications

## Unresolved Questions

1. Should organizers auto-have access to their events? (Yes, treat as assigned)
2. Check-in undo feature? (Not in MVP, admin can mark unchecked in DB)
3. Offline check-in support? (Not in MVP - requires sync conflict resolution)
4. QR code expiry time? (Event start + 24h recommended)
