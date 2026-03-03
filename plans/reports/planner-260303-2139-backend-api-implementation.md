# Backend API Implementation Plan - Summary Report

**Generated**: 2026-03-03
**Planner**: planner
**Target**: Phase 3 - Backend API Implementation
**Estimated Effort**: 16 hours

## Executive Summary

Comprehensive implementation plan for TicketStar's backend API covering event management, ticket sales, order processing with SePay integration, and QR-based check-in validation. The plan spans 8 phases with detailed technical specifications, following existing auth system patterns and layered architecture.

## Plan Location

```
/home/thaibeo/Code/ticketstar/plans/260303-2139-backend-api-implementation/
```

## Phase Breakdown

| Phase | Name | Effort | Dependencies | Status |
|-------|------|--------|--------------|--------|
| 1 | Infrastructure Setup | 1.5h | Phase 2 (Auth) | Pending |
| 2 | Domain & Repositories | 2h | Phase 1 | Pending |
| 3 | Event Service | 2.5h | Phase 2 | Pending |
| 4 | Order & Ticket Service | 3.5h | Phase 2, Phase 3 | Pending |
| 5 | Check-In Service | 2h | Phase 4 | Pending |
| 6 | External Integration | 1.5h | Phase 1, Phase 4 | Pending |
| 7 | Controllers & API | 2h | Phase 3, 4, 5 | Pending |
| 8 | Messaging & Cache | 1h | Phase 1 | Pending |

## Key Deliverables

### Services (4)
- `EventService`: CRUD, publishing, search, cache integration
- `OrderService`: Purchase flow, SePay webhook, ticket generation
- `CheckInService`: QR validation, staff authorization, check-in
- `CacheInvalidationService`: Redis cache management

### Repositories (7)
- `EventRepository`, `TicketTypeRepository`, `OrderRepository`
- `TicketRepository`, `PaymentRepository`, `CheckInRepository`
- `StaffAssignmentRepository`

### Controllers (4)
- `EventsController`: Public listing + organizer CRUD
- `OrdersController`: Purchase flow + order history
- `TicketsController`: My tickets + QR display
- `CheckInController`: Scan QR + reports

### Infrastructure
- QR code generation with HMAC-SHA256 signing
- Redis distributed locking for ticket quota
- MassTransit/RabbitMQ messaging
- SePay webhook handler with signature validation

## Technical Decisions

### Architecture
- **Pattern**: Clean architecture (API → Application → Domain ← Infrastructure)
- **Caching**: Cache-aside with Redis, fail-open degradation
- **Locking**: Distributed locks for quota enforcement
- **Messaging**: Fire-and-forget with console-log consumers (MVP)

### Security
- **QR Format**: `ticketId|eventId|userId|timestamp|hmac`
- **SePay**: HMAC signature validation on webhooks
- **Authorization**: Role-based with ownership checks
- **Rate Limiting**: Redis-backed sliding window

### Data Integrity
- **Quota Enforcement**: Distributed lock + atomic SQL increment
- **Idempotency**: SePay webhook by externalRef
- **Transactions**: Order + OrderItems + Payment atomic
- **Soft Delete**: Reuse User soft delete pattern for events

## Critical Path

```
Phase 1 (Infrastructure)
    ↓
Phase 2 (Repositories)
    ↓
Phase 3 (Event Service) ───┐
    ↓                      │
Phase 4 (Order Service) ───┼──→ Phase 7 (Controllers)
    ↓                      │
Phase 5 (CheckIn Service) ─┘
    ↓
Phase 6 (SePay Webhook)
    ↓
Phase 8 (Messaging)
```

## Risk Assessment

### Critical Risks
1. **Race condition on ticket quota** - Mitigated by Redis distributed lock
2. **SePay webhook replay** - Mitigated by idempotency on externalRef
3. **QR code forgery** - Mitigated by HMAC-SHA256 with secret key

### Medium Risks
1. **Cache staleness** - Invalidate on mutations, use short TTL
2. **RabbitMQ message loss** - Persistent queues, publisher confirms
3. **Lock timeout** - 10s timeout, release in finally block

## Success Criteria

### Functional
- [ ] All CRUD operations functional
- [ ] Ticket quota enforced (no overselling)
- [ ] QR codes generated with valid HMAC
- [ ] SePay webhook processes successfully
- [ ] Check-in validates QR codes
- [ ] Messages published to RabbitMQ

### Non-Functional
- [ ] API response < 200ms (p95)
- [ ] Cache hit rate > 50% on listings
- [ ] All services compile without errors
- [ ] Zero breaking changes to auth API
- [ ] `dotnet build` succeeds
- [ ] Health checks pass for all services

## Unresolved Questions

1. **SePay Integration**
   - Webhook signature location (header vs body)? → Check SePay docs
   - SePay sandbox environment for testing? → Need credentials
   - IP whitelist available? → Add when known

2. **QR Codes**
   - Expiry timestamp strategy? → Recommended: event start + 24h
   - Offline check-in support? → Not in MVP

3. **Events**
   - Soft delete pattern confirmed? → Yes, reuse User.IsDeleted
   - Search full-text vs LIKE? → LIKE sufficient for MVP

4. **Orders**
   - Lock held during payment? → No, only during creation
   - Refund policy? → Not in MVP

5. **Messaging**
   - Message encryption needed? → No, localhost RabbitMQ
   - Dead letter processing? → Manual for MVP
   - Real email integration? → Deferred to Phase 10

## File Structure (Created)

```
plans/260303-2139-backend-api-implementation/
├── plan.md                                    # Overview
├── phase-01-infrastructure-setup.md           # QR, locks, MassTransit
├── phase-02-domain-repositories.md            # 7 repositories
├── phase-03-event-service.md                  # Event CRUD + cache
├── phase-04-order-ticket-service.md           # Orders + tickets + SePay
├── phase-05-checkin-service.md                # QR validation + check-in
├── phase-06-external-integration.md           # SePay webhook + Google
├── phase-07-controllers-api.md                # 4 HTTP controllers
└── phase-08-messaging-cache.md                # MassTransit consumers
```

## Next Steps

1. **Start Phase 1**: Infrastructure setup (QR generation, distributed locks)
2. **Review dependencies**: Ensure MassTransit, QRCoder packages available
3. **Configuration**: Add SePay secret to environment variables
4. **Testing**: Set up integration test project

## Related Documentation

- [Roadmap](../../docs/development-roadmap.md) - Phase 3 details
- [System Architecture](../../docs/system-architecture.md) - Overall design
- [Code Standards](../../docs/code-standards.md) - Naming conventions
- [Auth Backend](../../docs/auth/backend-architecture.md) - Existing patterns

## Conclusion

This plan provides a complete roadmap for implementing TicketStar's backend API. All phases are designed to work independently while maintaining architectural consistency. The estimated 16 hours should deliver a production-ready API with proper security, caching, and messaging infrastructure.

**Status**: Ready for implementation
**Blockers**: None
**Recommendation**: Proceed with Phase 1 infrastructure setup
