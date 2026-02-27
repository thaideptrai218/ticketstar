# TicketStar - Project Overview & PDR

## Project Vision

TicketStar is a full-stack ticketing marketplace platform for event creation, ticket sales, QR-based check-in, and role-based access control (Admin, Organizer, Staff, Attendee).

## Product Development Requirements (PDR)

### Functional Requirements

#### Core Features
- **Event Management**: Organizers can create, update, and manage events with ticket tiers, pricing, and availability quotas
- **Ticket Sales**: Attendees can browse events, purchase tickets via SePay (VietQR), and receive QR tickets
- **QR Check-in**: Staff can scan attendee QR codes for event entry validation
- **Role-Based Access**: 4 distinct roles with specific permissions (Admin, Organizer, Staff, Attendee)
- **Authentication**: OAuth (Google) + Magic Link with JWT httpOnly cookies and refresh token rotation

#### User Roles
| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, platform configuration |
| **Organizer** | Create/manage events, view sales stats, manage payouts, view check-in statistics |
| **Staff** | Check-in attendees for assigned events, view event attendee lists |
| **Attendee** | Browse events, purchase tickets, view owned tickets, QR display for check-in |

### Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | API response time | < 200ms (p95) |
| **Scalability** | Concurrent users | Support 1000+ concurrent |
| **Security** | Authentication | JWT with refresh token rotation |
| **Security** | Authorization | Role-based with event-level permissions |
| **Availability** | Uptime | 99.5% (dev environment) |
| **Data Integrity** | Ticket quotas | Redis distributed locking |
| **Payment** | Integration | Real SePay (VietQR) webhook processing |

### Success Metrics

- **Phase 1 Complete**: Project scaffolding, builds passing
- **Phase 2 Complete**: Database schema implemented, identity system working
- **Phase 3 Complete**: Backend API endpoints functional
- **Phase 4-8 Complete**: Frontend for all 4 roles implemented
- **Phase 9 Complete**: End-to-end testing with >80% coverage

### Technical Constraints

| Constraint | Details |
|------------|---------|
| **Backend** | .NET 8, ASP.NET Core, EF Core + Pomelo MySQL |
| **Frontend** | Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| **Database** | MySQL 8 (port 3307) |
| **Cache** | Redis 7 (port 6380) |
| **Message Queue** | RabbitMQ 3 Management (ports 5672, 15672) |
| **Architecture** | Layered (API/Application/Domain/Infrastructure) - no CQRS/MediatR |
| **Payment** | SePay (VietQR) - real integration |
| **Email** | Console stub only (no real email infra in MVP) |
| **QR Format** | `ticketId|eventId|userId|timestamp` + HMAC-SHA256 |

### Technology Stack

```
Frontend (Port 3001)
├── Next.js 15.16
├── React 19.2.3
├── TypeScript 5
├── Tailwind CSS 4
├── shadcn/ui
└── TanStack React Query

Backend (Port 5010)
├── .NET 8
├── ASP.NET Core Web API
├── Entity Framework Core
├── Pomelo MySQL Provider
├── MassTransit (RabbitMQ)
└── JWT Authentication

Infrastructure (Docker)
├── MySQL 8.0 (Port 3307)
├── Redis 7-Alpine (Port 6380)
└── RabbitMQ 3-Management (Ports 5672, 15672)
```

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│  .NET 8 API     │────▶│     MySQL 8     │
│   Frontend      │     │  (Layered)      │     │   Database      │
│   Port: 3001    │     │  Port: 5010     │     │   Port: 3307    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌─────────────┐         ┌─────────────┐
            │   Redis 7   │         │  RabbitMQ 3 │
            │   Cache     │         │    Queue    │
            │ Port: 6380  │         │Ports: 5672  │
            └─────────────┘         │      15672  │
                                    └─────────────┘
```

### Project Structure

```
ticketstar/
├── backend/                  # .NET 8 Solution
│   ├── src/
│   │   ├── TicketStar.API/           # Web API layer
│   │   ├── TicketStar.Application/   # Business logic
│   │   ├── TicketStar.Domain/        # Entities & interfaces
│   │   └── TicketStar.Infrastructure/# EF Core, Redis, RabbitMQ
│   └── tests/
│       └── TicketStar.Tests/
├── frontend/                 # Next.js 15 App
│   ├── app/                  # App Router pages
│   ├── components/           # React components (shadcn/ui)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities
│   └── types/                # TypeScript types
├── docs/                    # Documentation
├── plans/                   # Implementation plans
└── docker-compose.yml       # Infrastructure services
```

### Development Status

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Project Scaffolding | ✅ Complete | 100% |
| 2. Database & Identity | 🔄 Pending | 0% |
| 3. Backend API | 🔄 Pending | 0% |
| 4. Frontend Auth & Layout | 🔄 Pending | 0% |
| 5. Frontend Marketplace | 🔄 Pending | 0% |
| 6. Frontend Attendee | 🔄 Pending | 0% |
| 7. Frontend Organizer | 🔄 Pending | 0% |
| 8. Frontend Staff & Admin | 🔄 Pending | 0% |
| 9. Testing | 🔄 Pending | 0% |

---

**Last Updated:** 2026-02-26
**Version:** 1.0.0
**Status:** Phase 1 Complete - Project Scaffolding
