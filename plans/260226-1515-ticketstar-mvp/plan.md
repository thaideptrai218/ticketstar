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

| #   | Phase                                                          | Effort | Status  | Depends On |
| --- | -------------------------------------------------------------- | ------ | ------- | ---------- |
| 1   | [Project Scaffolding](phase-01-project-scaffolding.md)         | 6h     | completed | —          |
| 2   | [Database & Identity](phase-02-database-and-identity.md)       | 10h    | pending | 1          |
| 3   | [Backend API](phase-03-backend-api.md)                         | 16h    | pending | 2          |
| 4   | [Frontend Auth & Layout](phase-04-frontend-auth-and-layout.md) | 8h     | pending | 1          |
| 5   | [Frontend Marketplace](phase-05-frontend-marketplace.md)       | 10h    | pending | 3, 4       |
| 6   | [Frontend Attendee](phase-06-frontend-attendee.md)             | 6h     | pending | 3, 4       |
| 7   | [Frontend Organizer](phase-07-frontend-organizer.md)           | 10h    | pending | 3, 4       |
| 8   | [Frontend Staff & Admin](phase-08-frontend-staff-admin.md)     | 6h     | pending | 3, 4       |
| 9   | [Testing](phase-09-testing.md)                                 | 8h     | pending | 5, 6, 7, 8 |

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

### Session 3 — 2026-02-26

| Phase        | Status | Completion Details                                               |
| ------------- | ------ | ---------------------------------------------------------------- |
| Phase 1       | completed | ✅ Docker Compose (MySQL 8, Redis 7, RabbitMQ 3)                 |
|              |        | ✅ .NET 8 solution with 4 projects (API, Application, Domain, Infrastructure) |
|              |        | ✅ Next.js 15 + TypeScript + shadcn/ui scaffolded               |
|              |        | ✅ Package dependencies installed (NuGet + npm)                 |
|              |        | ✅ Port mappings configured (3001, 5010, 3307, 6380)             |
|              |        | ✅ Git repository initialized with proper .gitignore            |

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

### Session 2 — 2026-02-26 (Unresolved Questions Resolved)

| Question                  | Decision                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| MVP scope                 | Full scope: all 4 roles (Admin, Organizer, Staff, Attendee) + QR + check-in |
| Email / Magic Link        | Console log only — dev copies token from server logs, no email infra         |
| Payment                   | Real SePay (VietQR) — bank transfer QR + webhook                             |
| CSRF protection           | SameSite=Lax only — no explicit CSRF tokens                                  |
| RabbitMQ / MassTransit    | Keep — stubbed consumers log to console, real infra from day 1               |
| Refresh token rotation    | Rotation + reuse detection (revoke all sessions on token reuse)              |
| Input validation          | DataAnnotations (built-in, no extra deps)                                    |
| Rate limiting             | ASP.NET Core built-in RateLimiter middleware                                 |
| QR payload format         | `ticketId\|eventId\|userId\|timestamp` + HMAC-SHA256                         |
| Database                  | MySQL + Pomelo (hard constraint, as planned)                                 |
| Organizer dashboard scope | Full dashboard: stats, check-in stats, payout views                          |

## Research Reports

- [Backend Architecture](research/researcher-01-backend.md)
- [Frontend Architecture](research/researcher-02-frontend.md)

## Red Team Reports

- [Security Review](reports/red-team-security.md) — 8 findings (questions resolved in Session 2)
- [Scope Review](reports/red-team-scope.md) — 6 findings (full scope confirmed in Session 2)
