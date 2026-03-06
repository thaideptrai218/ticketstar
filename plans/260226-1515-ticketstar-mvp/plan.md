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
| 4   | [Frontend Auth & Layout](phase-04-frontend-auth-and-layout.md) | 8h     | pending   | 1          |
| 5   | [Frontend Marketplace](phase-05-frontend-marketplace.md)       | 10h    | pending   | 3, 4       |
| 6   | [Frontend Attendee](phase-06-frontend-attendee.md)             | 6h     | pending   | 3, 4       |
| 7   | [Frontend Organizer](phase-07-frontend-organizer.md)           | 10h    | pending   | 3, 4       |
| 8   | [Frontend Staff & Admin](phase-08-frontend-staff-admin.md)     | 6h     | pending   | 3, 4       |
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
