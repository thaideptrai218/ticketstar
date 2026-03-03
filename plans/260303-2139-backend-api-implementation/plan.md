---
title: "Phase 3: Backend API Implementation"
description: "Core business API for event management, ticket sales, and QR check-in"
status: pending
priority: P1
effort: 16h
branch: main
tags: [backend, api, events, tickets, orders, checkin, redis, rabbitmq]
created: 2026-03-03
---

# Phase 3: Backend API Implementation

## Overview

Implement core business API services for TicketStar marketplace: Event CRUD, ticket purchasing with SePay integration, QR code generation, and check-in validation. Build on Phase 2's auth system with Redis caching, distributed locking, and RabbitMQ messaging.

## Progress

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Infrastructure Setup | Pending | 0% |
| Phase 2: Domain & Repositories | Pending | 0% |
| Phase 3: Event Service | Pending | 0% |
| Phase 4: Order & Ticket Service | Pending | 0% |
| Phase 5: Check-in Service | Pending | 0% |
| Phase 6: External Integration | Pending | 0% |
| Phase 7: Controllers & API | Pending | 0% |
| Phase 8: Messaging & Cache | Pending | 0% |

## Dependencies

- **Phase 2 (Complete)**: Database & Identity, Auth Hardening
- **Phase 4**: Frontend depends on these API endpoints

## Key Deliverables

1. **EventService**: CRUD operations + quota management
2. **TicketService**: Purchase flow + QR generation (HMAC-SHA256)
3. **OrderService**: SePay webhook processing + order lifecycle
4. **CheckInService**: QR validation + staff authorization
5. **Controllers**: Events, Orders, Tickets, Check-in
6. **Redis Cache**: Event listing, ticket quota locks
7. **RabbitMQ**: Order confirmation, check-in notifications

## Architecture

```
Request → Controller → Service → Repository → DbContext
                    ↓           ↓
                 Cache        Redis Lock
                    ↓
                 RabbitMQ Publisher
```

## Related Phase Files

- [Phase 1: Infrastructure Setup](phase-01-infrastructure-setup.md)
- [Phase 2: Domain & Repositories](phase-02-domain-repositories.md)
- [Phase 3: Event Service](phase-03-event-service.md)
- [Phase 4: Order & Ticket Service](phase-04-order-ticket-service.md)
- [Phase 5: Check-in Service](phase-05-checkin-service.md)
- [Phase 6: External Integration](phase-06-external-integration.md)
- [Phase 7: Controllers & API](phase-07-controllers-api.md)
- [Phase 8: Messaging & Cache](phase-08-messaging-cache.md)
