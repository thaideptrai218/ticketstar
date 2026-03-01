# CLAUDE.md — TicketStar

## What is this?

Full-stack ticketing marketplace: event creation, ticket sales (SePay/VietQR), QR check-in, RBAC (Admin/Organizer/Staff/Attendee).

## Tech Stack

- **Backend**: .NET 8, ASP.NET Core, EF Core + Pomelo MySQL, Redis, RabbitMQ (MassTransit)
- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query
- **Infra**: Docker Compose (MySQL 8 :3307, Redis 7 :6380, RabbitMQ 3 :5672/:15672)

## Architecture

Layered: `API → Application → Domain ← Infrastructure`

- **TicketStar.API** (port 5010): Controllers, Middleware, RateLimiting, Extensions
- **TicketStar.Application**: Services, DTOs, Interfaces, Options, Validation
- **TicketStar.Domain**: Entities, Enums, Interfaces (zero dependencies)
- **TicketStar.Infrastructure**: EF Core, Repositories, Cache (Redis), Messaging, ExternalServices

## Key Paths

```
backend/src/TicketStar.API/          # ASP.NET Core Web API
backend/src/TicketStar.Application/  # Business logic & services
backend/src/TicketStar.Domain/       # Domain entities & interfaces
backend/src/TicketStar.Infrastructure/ # Data access & external services
backend/tests/TicketStar.Tests/      # xUnit tests
frontend/src/                        # Next.js app
docs/                                # Project documentation
docs/auth/                           # Auth backend & API docs
plans/                               # Implementation plans
```

## Commands (justfile)

```
just dev          # Start all (infra + backend + frontend)
just infra        # Docker Compose up
just backend      # Run .NET API
just frontend     # Run Next.js dev
just build        # Build both
just test         # Run backend tests
just migrate      # Apply EF Core migrations
just migration <name>  # Create new migration
just db-reset     # Drop & recreate DB + migrate
just lint         # Lint frontend
just clean        # Clean build artifacts
```

## Auth System

- JWT httpOnly cookies (5min access, 7d refresh with rotation)
- TOTP MFA with recovery codes
- Google OAuth + Magic Link + Email/Password
- Redis rate limiting (sliding window per IP)
- Token blacklisting via Redis middleware
- Argon2id passwords, SHA-256 token hashing, AES-256 MFA secrets
- Fail-open strategy for Redis operations
- Account lockout: 5 failed attempts → 15min lock
- Security event audit trail (21 event types)

## Auth Endpoints

`POST /api/auth/` — register, login, google-login, magic-link/request, magic-link/verify, refresh, logout, revoke-all, mfa/setup, mfa/verify-setup, mfa/challenge, mfa/disable

## Database

MySQL 8 via EF Core. Key entities: User, AuthIdentity, AuthSession, RefreshToken, MagicLink, MfaRecoveryCode, SecurityEvent, UserProfile. Soft delete on User (global query filter). Optimistic concurrency on RefreshToken and MagicLink.

## Config

Settings in `appsettings.json` sections: Jwt, Mfa, Redis, GoogleAuth, Cors, ConnectionStrings. Env vars in `.env` (see `.env.example`).

## Conventions

- C#: PascalCase files/classes, `I` prefix interfaces, `Async` suffix, `_camelCase` privates
- TypeScript: kebab-case files, PascalCase components, camelCase functions
- Commits: conventional format `type(scope): description`
- Code files: <200 LOC, split when approaching limit
- Docs: <800 LOC per markdown file
- Tests: `MethodName_StateUnderTest_ExpectedBehavior`

## Development Status

Phase 2 complete (DB + Identity + Auth hardening). Frontend implementation pending.

## Docs Reference

- `docs/auth/backend-architecture.md` — Auth internals for backend devs
- `docs/auth/frontend-api-reference.md` — Auth API for frontend team
- `docs/system-architecture.md` — System architecture overview
- `docs/code-standards.md` — Coding conventions
- `docs/project-overview-pdr.md` — Project requirements
