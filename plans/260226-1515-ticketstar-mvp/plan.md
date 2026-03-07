---
title: "TicketStar MVP Implementation Plan"
description: "Full-stack ticketing marketplace: .NET 8 + Next.js 15 + MySQL + Redis + RabbitMQ"
status: in_progress
priority: P1
effort: 80h
branch: main
tags: [mvp, fullstack, ticketing, marketplace]
created: 2026-02-26
---

# TicketStar MVP — Implementation Plan

## Tech Stack

- **Backend:** .NET 8 ASP.NET Core, EF Core + Pomelo MySQL, Redis, MassTransit/RabbitMQ
- **Frontend:** Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Auth:** JWT httpOnly cookies, OAuth (Google) + Magic Link, refresh token rotation

## Phase Overview

| #   | Phase                                                          | Effort | Status    | Depends On |
| --- | -------------------------------------------------------------- | ------ | --------- | ---------- |
| 1   | [Project Scaffolding](phase-01-project-scaffolding.md)         | 6h     | completed | —          |
| 2   | [Database & Identity](phase-02-database-and-identity.md)       | 10h    | completed | 1          |
| 3   | [Backend API](phase-03-backend-api.md)                         | 16h    | completed | 2          |
| 4   | [Frontend Auth & Layout](phase-04-frontend-auth-and-layout.md) | 8h     | completed | 1          |
| 5   | [Frontend Marketplace](phase-05-frontend-marketplace.md)       | 10h    | completed | 3, 4       |
| 6   | [Frontend Attendee](phase-06-frontend-attendee.md)             | 6h     | completed | 3, 4       |
| 7   | [Frontend Organizer](phase-07-frontend-organizer.md)           | 10h    | completed | 3, 4       |
| 8   | [Frontend Staff & Admin](phase-08-frontend-staff-admin.md)     | 6h     | completed | 3, 4       |
| 9   | [Testing](phase-09-testing.md)                                 | 8h     | pending   | 5, 6, 7, 8 |

## Critical Path

1 → 2 → 3 → 5 (marketplace is the core user journey)
1 → 4 → 5/6/7/8 (frontend foundation unblocks all UI phases)

## Key Decisions

- Simple layered architecture (API/Application/Domain/Infrastructure) — no CQRS/MediatR
- httpOnly cookies for JWT — Next.js route handlers proxy auth
- Redis distributed lock for ticket quota enforcement
- MassTransit for RabbitMQ email stubs
- QR: HMAC-signed payload, base64 PNG in API response
- Real SePay (VietQR) payment integration
- QR payload: `ticketId|eventId|userId|timestamp` + HMAC-SHA256

## Validation Log

### Session 10 — 2026-03-07 (Phase 7 & 8 Implementation + Docs Finalization)

| Component | Status | Details |
| --- | --- | --- |
| **Phase 7** | completed | ✅ Organizer dashboard (stats, events CRUD, ticket types, orders, check-in, staff, payout) |
| **Phase 8** | completed | ✅ Staff check-in portal (QR scanner + manual entry), Admin dashboard, user management |
| **Backend** | completed | ✅ StaffController + StaffService + StaffDtos (StaffEventResponse), DbSeeder (5 users, 4 events, 6 TT, 7 orders) |
| **Frontend Routes** | completed | ✅ 10 organizer pages + 4 staff/admin pages, 100% route coverage |
| **Frontend Components** | completed | ✅ event-stats-card, event-form, ticket-type-form, ticket-type-list, orders-table, staff-management, payout-summary-card, checkin-result, manual-code-entry, users-table |
| **Build Status** | passing | ✅ `pnpm build` — 0 errors, 34 pages |
| **Documentation** | updated | ✅ plan.md, phase-07/08, roadmap, codebase-summary, system-architecture |

### Session 9 — 2026-03-07 (Phase 6 Final + Critical Auth Fixes + Docs Update)

| Component | Status | Details |
| --- | --- | --- |
| Phase 6 | completed | ✅ MyTickets, Orders, Ticket Transfer ALL COMPLETE |
| **Auth Cookie Flow** | fixed | ✅ Backend JWT reads `ts_at` via OnMessageReceived hook (was only Authorization header) |
| **Cookie Paths** | fixed | ✅ Proxy routes set `path=/` (backend default `/api/auth` caused scope issues) |
| **Auto-Refresh** | fixed | ✅ `fetchCurrentUser()` now retries on 401 after token refresh |
| **Role Mapping** | fixed | ✅ Proxy role guard includes `"User"` for attendee routes (backend uses `UserRole.User` enum) |
| **UI & Localization** | complete | ✅ All text Vietnamese, navbar shrink-on-scroll, role-based links, sticky footer |
| **Middleware** | updated | ✅ `middleware.ts` → `proxy.ts` (Next.js 16 convention) |
| **Docs** | updated | ✅ Roadmap, codebase-summary, system-architecture, plan — all reflect Phase 6 + fixes |

### Session 8 — 2026-03-07 (Phase 6 Implementation Complete)

| Phase   | Status    | Completion Details                                                            |
| ------- | --------- | ----------------------------------------------------------------------------- |
| Phase 6 | completed | ✅ MyTickets page with QR display (base64 PNG inline, click-to-enlarge)       |
|         |           | ✅ TicketCard, TicketQrDisplay, TicketTransferDialog components              |
|         |           | ✅ Order history page with status badges (color-coded)                       |
|         |           | ✅ Order detail page with items, payment info, tickets, cancel action        |
|         |           | ✅ Attendee layout with horizontal tab nav (Vietnamese labels)               |
|         |           | ✅ Types: MyTicket, TicketDetail, TransferTicketRequest                     |
|         |           | ✅ All files <200 LOC, build passes (0 errors)                              |

### Session 7 — 2026-03-07 (Phase 5 Implementation Complete)

| Phase   | Status    | Completion Details                                                            |
| ------- | --------- | ----------------------------------------------------------------------------- |
| Phase 4 | completed | ✅ Auth proxy layer with role-based middleware (auth.ts, api/auth/*)          |
|         |           | ✅ Role-based layouts (AdminLayout, OrganizerLayout, StaffLayout, AttendeeLayout) |
|         |           | ✅ Protected route wrappers with automatic redirects                         |
|         |           | ✅ Navigation enhancements (role-aware menus, breadcrumbs)                   |
| Phase 5 | completed | ✅ TypeScript types: events.ts, orders.ts (Event, TicketType, Order, OrderItem) |
|         |           | ✅ Event components: EventCard, EventGrid, EventFilters, TicketTypeSelector  |
|         |           | ✅ Checkout components: CheckoutForm, PaymentStatus                         |
|         |           | ✅ Hooks: useEventSearch (debounced search, URL params), useCheckout (polling state machine) |
|         |           | ✅ Pages: (public)/layout, (public)/events/page, events/[slug]/page, checkout/page |
|         |           | ✅ Format utilities: formatPrice, formatDate, formatVenue (DRY)              |
|         |           | ✅ Homepage wired: search → /events, "Xem tat ca" → /events                 |
|         |           | ✅ Build passes: 0 errors                                                   |
|         |           | ✅ Code review fixes: OrderDetail type, debounce polish, recursive setTimeout, formatPrice DRY, param validation |

### Session 6 — 2026-03-06 (Phase 3 Implementation Complete)

| Phase   | Status    | Completion Details                                                            |
| ------- | --------- | ----------------------------------------------------------------------------- |
| Phase 3 | completed | ✅ All 14 controllers implemented (Events, TicketTypes, Orders, Tickets, CheckIn, Staff, Admin, Payout) |
|         |           | ✅ All business logic services implemented (Event, Order, Ticket, CheckIn, Staff, Payout, QrCode, TicketLock, OrderExpiry) |
|         |           | ✅ Redis distributed lock for ticket quota enforcement (TicketLockService) |
|         |           | ✅ Mock SePay payment with webhook delay simulation (OrderService) |
|         |           | ✅ Order expiry via BackgroundService (OrderExpiryService, 60s polling) |
|         |           | ✅ QR code generation: HMAC-SHA256 signed payload, base64 PNG via QRCoder (QrCodeService) |
|         |           | ✅ Check-in with anti-duplicate validation (CheckInService) |
|         |           | ✅ Ticket transfer with new HMAC signature (TicketService) |
|         |           | ✅ Staff assignment & authorization per event (StaffService) |
|         |           | ✅ Admin user lock/unlock functionality (AdminService) |
|         |           | ✅ Payout reconciliation views with platform fee (PayoutService) |
|         |           | ✅ MassTransit message records + stub consumers (for Phase 8 real implementation) |
|         |           | ✅ Global error handling middleware with consistent ApiResponse wrapper |
|         |           | ✅ ApiControllerBase with consistent response formatting |
|         |           | ✅ Code review fixes: layering violations fixed, authorization tightened, webhook body double-read fixed |
|         |           | ✅ Build passes: 0 errors, 0 warnings |

### Session 5 — 2026-02-26 (Phase 2 Schema Review)

| Question | Decision |
| --- | --- |
| QrData field | Dropped — QrCode stores HMAC-signed payload; raw payload derivable, QR image generated on-the-fly |
| Money column type | `decimal(12,0)` — VND has no fractional units |
| RefreshToken.ReplacedByToken | Added — required for reuse detection chain |
| CreatedAt/UpdatedAt | CreatedAt on all entities; UpdatedAt on mutable entities (Event, Order, TicketType, Payment) |
| Missing indexes | Added: Events(Slug) unique, Events(OrganizerId), CheckIns(EventId,TicketId), Payments(OrderId) unique, RefreshTokens(UserId), MagicLinkTokens(Token) unique |

### Session 4 — 2026-02-26 (Phase 2 Validation)

| Question | Decision |
| --- | --- |
| Google OAuth in dev | Real Google credentials from day 1 — set up Google Cloud project before implementation |
| Magic Link email | Console stub only — log token to console, no real email infra in Phase 2 |
| Refresh token hashing | SHA-256 before storing in DB |
| Staff role model | Role + per-event assignment as planned (4 roles seeded in Identity) |
| JWT config storage | `appsettings.Development.json` (gitignored) |
| Google token validation | `Google.Apis.Auth` NuGet package — `GoogleJsonWebSignature.ValidateAsync()` |
| Rate limiting | ASP.NET Core built-in `RateLimiter` middleware on magic link endpoint (per-IP) |

### Session 3 — 2026-02-26

| Phase   | Status    | Completion Details                                                            |
| ------- | --------- | ----------------------------------------------------------------------------- |
| Phase 1 | completed | ✅ Docker Compose (MySQL 8, Redis 7, RabbitMQ 3)                              |
|         |           | ✅ .NET 8 solution with 4 projects (API, Application, Domain, Infrastructure) |
|         |           | ✅ Next.js 15 + TypeScript + shadcn/ui scaffolded                             |
|         |           | ✅ Package dependencies installed (NuGet + npm)                               |
|         |           | ✅ Port mappings configured (3001, 5010, 3307, 6380)                          |
|         |           | ✅ Git repository initialized with proper .gitignore                          |

### Session 2 — 2026-02-26 (Phase 2 Implementation Complete)

| Phase   | Status    | Completion Details                                                            |
| ------- | --------- | ----------------------------------------------------------------------------- |
| Phase 2 | completed | ✅ All 10 entity models + 3 enums created (AppDbContext + 10 EF configs)     |
|         |           | ✅ Auth DTOs, ITokenService, IAuthService interfaces designed                 |
|         |           | ✅ TokenService, AuthService, MagicLinkService, UserHelper implemented       |
|         |           | ✅ AuthController (5 endpoints) + DbSeeder completed                          |
|         |           | ✅ Program.cs configured (Identity, JWT, EF Core, per-IP rate limiting)       |
|         |           | ✅ Initial migration applied to MySQL (all 17 tables created)                 |
|         |           | ✅ Code review fixes: SHA-256 hashing, RefreshToken.Token unique index       |

### Session 1 — 2026-02-26

| Question         | Decision                                                          |
| ---------------- | ----------------------------------------------------------------- |
| Repo structure   | Single repo: `/backend` + `/frontend` + root `docker-compose.yml` |
| Mock payment     | `Task.Run` with 3-5s delay, frontend polls order status           |
| Package manager  | pnpm                                                              |
| Docker scope     | Infra only (MySQL, Redis, RabbitMQ). Apps run natively.           |
| Auth methods     | OAuth (Google) + Magic Link                                       |
| Refresh tokens   | Rotation enabled                                                  |
| Offline check-in | No (online only)                                                  |

## Research Reports

- [Backend Architecture](research/researcher-01-backend.md)
- [Frontend Architecture](research/researcher-02-frontend.md)

## Red Team Reports

- [Security Review](reports/red-team-security.md) — 8 findings (questions resolved in Session 2)
- [Scope Review](reports/red-team-scope.md) — 6 findings (full scope confirmed in Session 2)
