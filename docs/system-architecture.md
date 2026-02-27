# TicketStar - System Architecture

## Architecture Overview

TicketStar uses a **layered architecture** pattern with clear separation of concerns. The backend follows Clean Architecture principles (API/Application/Domain/Infrastructure layers), while the frontend uses Next.js 15 App Router with server and client components.

## Backend Architecture (.NET 8)

### Layer Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      TicketStar.API                         │
│  - Controllers (Endpoints)                                  │
│  - Filters/Middleware                                       │
│  - JWT Authentication                                       │
│  - Program.cs (Configuration)                               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                 TicketStar.Application                      │
│  - Services (Business Logic)                                │
│  - DTOs/Mappings                                            │
│  - Validation                                               │
│  - Business Rules                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                   TicketStar.Domain                         │
│  - Entities (Domain Models)                                 │
│  - Value Objects                                            │
│  - Interfaces (Repository, Service)                         │
│  - Domain Events                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              TicketStar.Infrastructure                      │
│  - EF Core DbContext                                        │
│  - Repository Implementations                               │
│  - Redis Cache Service                                      │
│  - RabbitMQ Consumers (MassTransit)                         │
│  - External Services (SePay, Google OAuth)                  │
└─────────────────────────────────────────────────────────────┘
```

### Project Dependencies

```
TicketStar.API
    ↓
TicketStar.Application
    ↓
TicketStar.Domain
    ↑
TicketStar.Infrastructure
```

- **API** depends on Application
- **Application** depends on Domain
- **Infrastructure** depends on Domain (Domain is core, no dependencies)
- **Domain** has zero dependencies (pure C# entities/interfaces)

### Solution Structure

```
backend/
├── TicketStar.sln
├── src/
│   ├── TicketStar.API/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   ├── Filters/
│   │   └── Program.cs
│   ├── TicketStar.Application/
│   │   ├── Services/
│   │   ├── DTOs/
│   │   ├── Mappings/
│   │   └── Validation/
│   ├── TicketStar.Domain/
│   │   ├── Entities/
│   │   ├── ValueObjects/
│   │   ├── Interfaces/
│   │   └── Enums/
│   └── TicketStar.Infrastructure/
│       ├── Data/
│       │   └── AppDbContext.cs
│       ├── Repositories/
│       ├── Cache/
│       ├── Messaging/
│       └── ExternalServices/
└── tests/
    └── TicketStar.Tests/
```

## Frontend Architecture (Next.js 15)

### App Router Structure

```
frontend/
├── app/                          # App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   └── magic-link/
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── organizer/
│   │   ├── staff/
│   │   └── admin/
│   ├── (marketplace)/            # Public marketplace
│   │   ├── events/
│   │   └── tickets/
│   ├── api/                      # Route handlers (API proxy)
│   │   └── auth/
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # React components
│   ├── ui/                       # shadcn/ui base components
│   ├── auth/                     # Auth-specific components
│   ├── events/                   # Event components
│   ├── tickets/                  # Ticket components
│   └── checkout/                 # Checkout components
├── hooks/                        # Custom React hooks
├── lib/                          # Utilities
│   ├── api.ts                    # API client
│   ├── query.ts                  # React Query setup
│   └── utils.ts                  # Helper functions
└── types/                        # TypeScript types
```

### Component Patterns

- **Server Components** (default): Data fetching, static content
- **Client Components** (`"use client"`): Interactive UI, forms, real-time updates
- **Route Handlers**: Proxy API calls, handle auth cookies

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│ Next.js     │────▶│  .NET API   │
│             │     │ Route       │     │             │
│             │     │ Handlers    │     │             │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                          │                    │
                    ┌─────┴─────┐      ┌───────┴───────┐
                    │ React Query│      │  Controller  │
                    │ (Client)   │      │     ↓        │
                    └───────────┘      │  Service      │
                                       │     ↓        │
                                       │ Repository   │
                                       └──────┬───────┘
                                              │
                                 ┌────────────┴────────────┐
                                 ▼                         ▼
                          ┌──────────┐            ┌──────────┐
                          │  MySQL   │            │  Redis   │
                          └──────────┘            └──────────┘
```

## Infrastructure Architecture

### Docker Services

```yaml
Services:
  mysql:8.0      (Port 3307)
    - Database: ticketstar
    - Volume: mysql-data

  redis:7-alpine (Port 6380)
    - Password protected
    - Distributed locking

  rabbitmq:3     (Ports 5672, 15672)
    - Management UI: http://localhost:15672
    - Message broker for email stubs
```

### Service Communication

```
┌──────────────┐
│  Next.js     │───▶ .NET API (HTTP/JSON)
│  Frontend    │    │
└──────────────┘    │
                    ▼
┌─────────────────────────────────────┐
│         .NET API Layer              │
│  ┌───────────────────────────────┐  │
│  │ Controllers → Services        │  │
│  │     │                         │  │
│  │     ├──▶ Repository (MySQL)   │  │
│  │     │                         │  │
│  │     ├──▶ Cache (Redis)        │  │
│  │     │                         │  │
│  │     └──▶ Message Bus (RabbitMQ)│ │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Authentication Architecture

### JWT Flow (httpOnly Cookies)

```
┌─────────────┐                ┌─────────────┐
│   Browser   │                │   .NET API  │
└──────┬──────┘                └──────┬──────┘
       │                              │
       │ 1. POST /auth/login-email    │
       │─────────────────────────────▶│
       │                              │
       │ 2. Validate password (Argon2)│
       │    Generate JWT              │
       │    Set httpOnly cookie       │
       │◀─────────────────────────────│
       │                              │
       │ 3. Subsequent requests       │
       │    include cookie            │
       │─────────────────────────────▶│
       │                              │
       │ 4. Validate JWT              │
       │    Return data               │
       │◀─────────────────────────────│
```

### OAuth Flow (Google/Apple)

```
1. POST /auth/google → Redirect URL
2. Client redirects to Google
3. Google callback → Validate token
4. Create/link AuthIdentity
5. Generate JWT + Refresh Token
6. Set httpOnly cookie
```

### Refresh Token Rotation

```
Login → Access Token (15min) + Refresh Token (7d)
  ↓
Access expires
  ↓
Refresh request → Validate token → Rotate pair
  ↓
Reuse detection → Revoke all sessions (security)
```

### Magic Link Flow

```
1. POST /auth/magic-link/request (email)
2. Generate token (CSPRNG, 32 bytes)
3. Store MagicLink in DB
4. Send link to email
5. POST /auth/magic-link/verify (token)
6. Validate & create session
```

### Security Services

- **Argon2PasswordHasher** - OWASP 2025 password hashing (t=3, m=64MB, p=4)
- **Sha256TokenHasher** - Constant-time token verification
- **CryptoRandomService** - Cryptographically secure random generation
- **Account Lockout** - 5 failed login attempts → locked
- **Security Events** - Audit trail for all auth actions

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Layered over CQRS** | Simpler for MVP, single models for read/write |
| **httpOnly cookies** | More secure than localStorage, XSS-resistant |
| **Redis distributed lock** | Prevents ticket overselling in high-concurrency scenarios |
| **MassTransit + RabbitMQ** | Real infra from day 1, stubbed consumers for dev |
| **App Router over Pages** | Next.js 15 default, better server/client component separation |
| **shadcn/ui** | Copy-paste components, full customization control |
| **SePay integration** | Real payment processing, no mocking in production path |

## Security Architecture

### Authentication Layers
1. **Next.js Route Handlers**: Proxy auth requests, handle OAuth flow
2. **.NET API**: JWT validation, refresh token rotation
3. **Authorization**: Role-based + event-level permissions

### Data Protection
- Passwords: Argon2id hashed (OWASP 2025 compliant)
- Refresh Tokens: SHA-256 hashed before storage (constant-time comparison)
- Magic Link Tokens: CSPRNG generated, SHA-256 hashed
- QR Codes: HMAC-SHA256 signed payloads
- JWT: Signed with secret key, 15min expiry
- Email Changes: Verification required before update

### Rate Limiting
- ASP.NET Core RateLimiter middleware
- Per-IP limits on magic link endpoint
- Redis-backed for distributed scenarios

---

**Last Updated:** 2026-02-27
**Phase:** 2 Complete - Authentication System
