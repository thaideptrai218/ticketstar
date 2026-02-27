# TicketStar Backend - Project Overview & Product Development Requirements

## Executive Summary

TicketStar is a modern event ticketing platform providing secure, scalable APIs for event management, ticket sales, and payment processing. The backend is built on .NET 8 with a clean layered architecture, emphasizing security, maintainability, and extensibility.

**Status:** Phase 2 - Core Authentication & Infrastructure Complete
**Target Release:** Q2 2026
**Team:** Development Team
**Repository:** `/home/welterial/projects/ticketstar/backend`

---

## Project Vision

Enable event organizers to sell tickets online with a secure, user-friendly platform. Provide customers with a seamless booking experience across web and mobile devices.

### Core Values

- **Security First** — Protect user data and payment information
- **Simplicity** — Clean code, clear APIs, easy to extend
- **Reliability** — High uptime, graceful error handling
- **Performance** — Fast ticket sales even at scale

---

## Product Scope

### Phase 1: Authentication & Session Management ✅ COMPLETE

**Completion Date:** 2026-02-27

**Deliverables:**

- User registration & login (email/password)
- Passwordless authentication (magic links)
- JWT token management (access + refresh)
- Session tracking & invalidation
- OAuth identity linking (Google, Apple, WebAuthn)
- Security event logging (audit trail)
- Rate limiting on auth endpoints

**Key Files:**

- `TicketStar.Application/Services/AuthService.cs`
- `TicketStar.Application/Services/TokenService.cs`
- `TicketStar.API/Controllers/AuthController.cs`
- `TicketStar.Domain/Interfaces/IAuthService.cs`

**Acceptance Criteria:** ✅ MET

- Users can register with email/password
- Login returns JWT + refresh token
- Refresh token extends session
- Passwordless links are secure (Crypto.Random)
- All auth endpoints rate-limited
- Security events logged for audit trail
- 70%+ unit test coverage

---

### Phase 2: Design Patterns & Infrastructure ✅ COMPLETE

**Completion Date:** 2026-02-27

**Deliverables:**

- Result pattern for transport-agnostic error handling
- API response envelope (success/data/error/traceId)
- Global exception middleware
- ApiControllerBase for HTTP→Result mapping
- Repository + Unit of Work pattern
- Options pattern for configuration
- Health check endpoints (/health/live, /health/ready)
- DI extension methods
- Pagination support (offset + cursor-based)
- Comprehensive test infrastructure

**Key Files:**

- `TicketStar.Application/Common/Result.cs`
- `TicketStar.API/Models/ApiResponse.cs`
- `TicketStar.API/Middleware/GlobalExceptionMiddleware.cs`
- `TicketStar.API/Controllers/ApiControllerBase.cs`
- `TicketStar.Infrastructure/Repositories/EfRepository.cs`
- `TicketStar.API/Extensions/ServiceCollectionExtensions.cs`

**Acceptance Criteria:** ✅ MET

- All errors mapped to ResultError enum
- API responses have consistent envelope format
- Unhandled exceptions return JSON (not HTML)
- Controllers inherit from ApiControllerBase
- Repository pattern with generic IRepository<T>
- Options validated at startup
- Health checks respond correctly
- Program.cs is clean (~65 lines)

---

### Phase 3: Event Management (IN PROGRESS)

**Target Completion:** 2026-03-31

**Deliverables:**

- Event creation & editing
- Event status workflow (Draft → Published → Completed)
- Event capacity management
- Event search & filtering
- Venue & location management
- Staff role assignment

**Requirements:**

**Functional Requirements:**

- Event organizers can create/edit events
- Events have dates, locations, descriptions, capacity
- Event status: Draft, Published, Cancelled, Completed
- Soft-delete events (archive, don't destroy data)
- Organizers can assign staff to events
- Query events by date range, location, status

**Non-Functional Requirements:**

- Event list endpoint supports pagination
- Search works on event name/description
- Organizer sees only their own events
- Staff assignment audit trail

**Architecture:**

- EventService in Application layer
- IEventRepository & IStaffAssignmentRepository
- Event & StaffAssignment entities in Domain
- EventController with Create/Update/List/Get endpoints

**Success Criteria:**

- POST /api/events → 201 Created
- PUT /api/events/{id} → 200 OK
- GET /api/events → 200 OK with pagination
- Only event organizer can edit/delete
- 70%+ unit test coverage
- Full integration tests for workflows

---

### Phase 4: Ticket Management (PLANNED)

**Target Completion:** 2026-04-30

**Deliverables:**

- Ticket type definition (VIP, General, Student, etc.)
- Ticket pricing & inventory
- Ticket status workflow
- Seat/section assignment
- Ticket generation on order

**Requirements:**

**Functional Requirements:**

- Event organizers define ticket types per event
- Ticket types have names, prices, quantities
- Inventory tracking (available, sold, reserved)
- Prevent overselling
- Support dynamic pricing
- Generate unique ticket codes on order

**Non-Functional Requirements:**

- Ticket inventory atomic operations
- Support bulk ticket generation
- Ticket codes are unique & cryptographically secure

**Success Criteria:**

- POST /api/events/{id}/ticket-types → 201 Created
- GET /api/events/{id}/tickets → Returns all tickets with status
- Inventory prevents overselling
- Ticket codes are unique (validate with tests)
- 70%+ test coverage

---

### Phase 5: Orders & Shopping Cart (PLANNED)

**Target Completion:** 2026-05-31

**Deliverables:**

- Shopping cart management
- Order creation from cart
- Order status tracking
- Order history for users
- Invoice generation

**Requirements:**

**Functional Requirements:**

- Users add tickets to cart (per event)
- Cart persists for 24 hours
- Order creation: cart → Order + OrderItems
- Order status: Pending, Paid, Cancelled, Refunded
- Users see order history with invoices

**Non-Functional Requirements:**

- Cart operations are fast (<100ms)
- Reservations expire if not paid within 30 minutes
- Orders immutable (no editing, only refunds)

**Success Criteria:**

- POST /api/cart → Add to cart
- POST /api/orders → Create order from cart
- GET /api/orders → User's order history
- Cart expires correctly
- 70%+ test coverage

---

### Phase 6: Payments (PLANNED)

**Target Completion:** 2026-06-30

**Deliverables:**

- Stripe integration
- Payment processing
- Payment status tracking
- Refund handling
- Invoice receipts

**Requirements:**

**Functional Requirements:**

- Users pay via Stripe (cards, Google Pay, Apple Pay)
- Payment status: Pending, Completed, Failed, Refunded
- Order moves to Paid once payment succeeds
- Webhooks handle async payment updates
- Invoice emailed on successful payment

**Non-Functional Requirements:**

- PCI compliance (no card data stored)
- Idempotent payment operations
- Webhook signature validation

**Success Criteria:**

- POST /api/orders/{id}/pay → Initiates Stripe payment
- Webhook updates payment status correctly
- Failed payments don't lock orders
- Refunds reduce inventory
- 70%+ test coverage

---

### Phase 7: Notifications (PLANNED)

**Target Completion:** 2026-07-31

**Deliverables:**

- Email notifications (registration, order confirmation, invoice)
- Event reminders (1 day before)
- Order status updates
- Support for SMS (future)

**Requirements:**

**Functional Requirements:**

- Send emails on registration
- Send order confirmation + invoice on payment
- Send event reminder 1 day before
- Send ticket delivery email
- Support unsubscribe links

**Non-Functional Requirements:**

- Email queuing for reliability
- Retry logic for failed sends
- Template-based emails

**Success Criteria:**

- Emails sent reliably (99%+)
- Templates are customizable
- Unsubscribe works correctly
- 70%+ test coverage

---

### Phase 8: Admin & Analytics (PLANNED)

**Target Completion:** 2026-08-31

**Deliverables:**

- Admin dashboard endpoints
- Event analytics (sales, attendance, revenue)
- Customer reports
- Revenue reporting

**Requirements:**

**Functional Requirements:**

- Admins see all events/orders
- Analytics: tickets sold, revenue, attendance
- Reports exportable as CSV/PDF
- Real-time dashboard data

**Non-Functional Requirements:**

- Analytics cached (5-minute refresh)
- Reports generated asynchronously
- Support large datasets (100k+ events)

**Success Criteria:**

- GET /api/admin/events → All events with stats
- GET /api/admin/analytics → Revenue, attendance, trends
- Reports generate correctly
- 70%+ test coverage

---

## Technical Architecture

### Layered Design

```
┌─────────────────────────────────┐
│   API Layer (Controllers)        │ HTTP ←→ REST
├─────────────────────────────────┤
│ Application Layer (Services)    │ Business Logic
├─────────────────────────────────┤
│ Infrastructure Layer (Data)     │ EF Core, MySQL
├─────────────────────────────────┤
│ Domain Layer (Entities)         │ Business Rules
└─────────────────────────────────┘
```

### Key Patterns Implemented

1. **Result Pattern** — Transport-agnostic error handling
2. **Repository Pattern** — Generic + entity-specific data access
3. **Unit of Work Pattern** — Transaction coordination
4. **Options Pattern** — Type-safe configuration
5. **Dependency Injection** — Clean service registration
6. **Health Checks** — Container orchestration support
7. **API Response Envelope** — Consistent JSON format

### Technology Stack

| Component      | Technology            | Version              |
| -------------- | --------------------- | -------------------- |
| Runtime        | .NET                  | 8.0                  |
| Language       | C#                    | 12                   |
| Web Framework  | ASP.NET Core          | 8.0                  |
| ORM            | Entity Framework Core | 8.0                  |
| Database       | MySQL                 | 8.0+                 |
| Authentication | JWT (Bearer)          | OpenID Connect ready |
| Testing        | xUnit + Moq           | Latest               |
| Security       | Argon2 + SHA256       | Industry standard    |

---

## Non-Functional Requirements

### Performance

| Requirement             | Target          | Status          |
| ----------------------- | --------------- | --------------- |
| API response time (p95) | <200ms          | ✅              |
| Database query time     | <100ms          | ✅              |
| Concurrent users        | 1000+           | 🔜 Load testing |
| Ticket sale capacity    | 100 tickets/sec | 🔜 Optimization |
| Page load time          | <1s             | 🔜 Frontend     |

### Scalability

- **Horizontal scaling** via stateless APIs
- **Database sharding** for large event volumes (future)
- **Caching** with Redis (planned)
- **Message queues** for async operations (planned)

### Reliability

- **Uptime target** 99.9% (43 minutes downtime/month)
- **Backup strategy** Daily automated backups
- **Disaster recovery** RTO 1 hour, RPO 15 minutes
- **Circuit breakers** for external service failures

### Security

- ✅ HTTPS only (TLS 1.3)
- ✅ CORS configured for frontend origin
- ✅ Rate limiting on auth endpoints
- ✅ Input validation on all endpoints
- ✅ Password hashing with Argon2
- ✅ JWT with secure signatures
- ✅ Refresh token rotation
- ✅ Security event logging
- 🔜 SQL injection prevention (parameterized queries)
- 🔜 CSRF protection
- 🔜 DDoS protection

### Compliance

- 🔜 GDPR data retention
- 🔜 PCI DSS (once payments added)
- 🔜 SOC 2 audit
- ✅ Audit logging for security events

---

## Code Quality Standards

### Maintainability

- **File size:** Keep under 200 lines per file
- **Cyclomatic complexity:** Keep methods under 10 branches
- **Code duplication:** DRY principle, extract helpers
- **Naming:** Clear, descriptive names (PascalCase for C#)
- **Comments:** Document "why", not "what" is obvious

### Testing

- **Unit test coverage:** 70%+ for business logic
- **Integration tests:** Critical workflows
- **Test data:** Realistic, not mocked
- **Test isolation:** Each test independent
- **Running tests:** `dotnet test` before commits

### Documentation

- **README.md** — Setup and quick start
- **code-standards.md** — Directory structure and patterns
- **backend-design-patterns.md** — Pattern implementations
- **codebase-summary.md** — Architecture overview
- **API documentation** — Swagger/OpenAPI

---

## Release Plan

### Timeline

```
Phase 1 ✅ DONE      (Feb 2026) - Auth + Sessions
Phase 2 ✅ DONE      (Feb 2026) - Design Patterns
Phase 3 IN PROGRESS  (Mar 2026) - Event Management
Phase 4 PLANNED      (Apr 2026) - Tickets
Phase 5 PLANNED      (May 2026) - Orders & Cart
Phase 6 PLANNED      (Jun 2026) - Payments
Phase 7 PLANNED      (Jul 2026) - Notifications
Phase 8 PLANNED      (Aug 2026) - Admin & Analytics

MVP Launch          (Sep 2026) - Phase 1-6 complete
Public Beta         (Oct 2026) - All phases complete
```

### Go-Live Checklist

- [ ] All phases complete
- [ ] 70%+ test coverage across codebase
- [ ] Load testing (1000+ concurrent users)
- [ ] Security audit (OWASP Top 10)
- [ ] Database backup/recovery tested
- [ ] Monitoring & alerting configured
- [ ] Incident response plan documented
- [ ] SLA documented (99.9% uptime target)

---

## Dependencies & Risks

### External Dependencies

| Dependency    | Status        | Risk                      |
| ------------- | ------------- | ------------------------- |
| .NET 8 SDK    | ✅ Available  | Low                       |
| MySQL 8.0+    | ✅ Available  | Low                       |
| Stripe API    | 🔜 Jun 2026   | Medium (late integration) |
| Google OAuth  | ✅ Integrated | Low                       |
| Email service | 🔜 Jul 2026   | Low                       |

### Risk Mitigation

| Risk                    | Impact | Mitigation                                               |
| ----------------------- | ------ | -------------------------------------------------------- |
| Performance at scale    | High   | Load testing in Phase 4, caching in Phase 5              |
| Payment failures        | High   | Idempotent operations, retry logic, webhook verification |
| Database locks          | Medium | Connection pooling, query optimization                   |
| Token expiry edge cases | Medium | Comprehensive token tests, clear error messages          |
| Email delivery failures | Medium | Queue-based system, exponential backoff                  |

---

## Success Metrics

### Business Metrics

- **User signups** Target: 10,000 by month 6
- **Event creation** Target: 1,000 events by month 6
- **Ticket sales** Target: 100,000 tickets by month 6
- **Revenue** Target: $500k by month 6

### Technical Metrics

- **API availability** Target: 99.9%
- **Response time (p95)** Target: <200ms
- **Error rate** Target: <0.1%
- **Test coverage** Target: 70%+
- **Deployment frequency** Target: 2x per week

---

## Team & Responsibilities

### Development Team

| Role              | Responsibility                               |
| ----------------- | -------------------------------------------- |
| Lead Developer    | Architecture, code reviews, Phase leadership |
| Backend Developer | Core service implementation                  |
| QA Engineer       | Testing, CI/CD, performance monitoring       |
| DevOps Engineer   | Infrastructure, deployment, monitoring       |

### Communication

- **Daily standup** 9:00 AM (15 minutes)
- **Code review** At least 2 approvals before merge
- **Sprint planning** Every 2 weeks
- **Release notes** Updated per phase

---

## Glossary

| Term               | Definition                                                                       |
| ------------------ | -------------------------------------------------------------------------------- |
| Result Pattern     | Transport-agnostic error handling; services return Result<T> instead of throwing |
| Unit of Work       | Single transaction coordinator managing multiple repositories                    |
| Repository Pattern | Data access abstraction; decouples services from database                        |
| Options Pattern    | Type-safe configuration with validation                                          |
| Refresh Token      | Long-lived token used to obtain new access tokens                                |
| Magic Link         | Passwordless authentication via email link                                       |
| Health Check       | Endpoint for monitoring API liveness/readiness                                   |
| Trace ID           | Request correlation ID for logging                                               |
| JWT                | JSON Web Token for stateless authentication                                      |

---

## References

- [.NET Architecture Guide](https://learn.microsoft.com/en-us/dotnet/architecture/)
- [ASP.NET Core Best Practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices)
- [Entity Framework Core Docs](https://learn.microsoft.com/en-us/ef/core/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Result Pattern in C#](https://www.martinfowler.com/articles/failureAndProgress.html)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-27
**Approval Status:** Draft (Ready for Team Review)
**Next Review:** 2026-03-31 (End of Phase 3)
