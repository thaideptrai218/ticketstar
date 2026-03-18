# TicketStar

Full-stack ticketing marketplace platform — event creation, ticket sales via SePay (VietQR), QR-based check-in, and role-based access control.

## Tech Stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Backend  | .NET 8, ASP.NET Core, EF Core, Pomelo MySQL                 |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Database | MySQL 8.0                                                   |
| Cache    | Redis 7                                                     |
| Queue    | RabbitMQ 3                                                  |
| Auth     | JWT (httpOnly cookies), Google OAuth, Magic Link, TOTP MFA  |
| Payments | SePay (VietQR)                                              |

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/) with [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) & Docker Compose
- [just](https://github.com/casey/just) (optional, for task runner)

## Quick Start

**Prerequisites:** [just](https://github.com/casey/just), Docker, .NET 8 SDK, Node.js 20+ with pnpm, dotnet-ef (`dotnet tool install --global dotnet-ef`)

```bash
# 1. Setup env
cp .env.example .env
# Edit .env with your values (JWT secret, MFA key, Google OAuth ID)

# 2. Install frontend dependencies
just install

# 3. Start everything (Docker infra + DB migrations + backend + frontend)
just start
```

`just start` will:
1. Start MySQL 8 (:3307), Redis 7 (:6380), RabbitMQ 3 (:5672) via Docker
2. Wait for services to be ready
3. Apply EF Core database migrations
4. Start the .NET API on http://localhost:5010
5. Start the Next.js frontend on http://localhost:3001

**Stop everything:**
```bash
just stop    # stop backend + frontend processes only
just down    # stop processes + Docker infrastructure
```

## Services

| Service        | URL                                |
| -------------- | ---------------------------------- |
| Frontend       | http://localhost:3001              |
| Backend API    | http://localhost:5010              |
| Swagger        | http://localhost:5010/swagger      |
| RabbitMQ UI    | http://localhost:15672             |
| Health (live)  | http://localhost:5010/health/live  |
| Health (ready) | http://localhost:5010/health/ready |

## Project Structure

```
ticketstar/
├── backend/
│   ├── src/
│   │   ├── TicketStar.API/            # Web API (controllers, middleware)
│   │   ├── TicketStar.Application/    # Business logic & services
│   │   ├── TicketStar.Domain/         # Entities & interfaces
│   │   └── TicketStar.Infrastructure/ # Data access, Redis, RabbitMQ
│   └── tests/
│       └── TicketStar.Tests/          # xUnit tests
├── frontend/                          # Next.js 15 App Router
├── docs/                              # Documentation
│   ├── auth/                          # Auth guides (backend + frontend API)
│   ├── system-architecture.md
│   ├── code-standards.md
│   └── project-overview-pdr.md
└── docker-compose.yml
```

## Architecture

Layered backend: **API → Application → Domain ← Infrastructure**

- No CQRS/MediatR — simple layered for MVP
- Auth: JWT httpOnly cookies, refresh token rotation, TOTP MFA, Redis rate limiting
- Security: Argon2id passwords, SHA-256 token hashing, AES-256 MFA encryption

See [docs/system-architecture.md](docs/system-architecture.md) for details.

## User Roles

| Role      | Access                           |
| --------- | -------------------------------- |
| Admin     | Full system management           |
| Organizer | Create/manage events, view sales |
| Staff     | Check-in attendees               |
| Attendee  | Browse, purchase, view tickets   |

## API Documentation

- **Auth API** (frontend team): [docs/auth/frontend-api-reference.md](docs/auth/frontend-api-reference.md)
- **Auth Architecture** (backend team): [docs/auth/backend-architecture.md](docs/auth/backend-architecture.md)
- **Swagger**: http://localhost:5010/swagger (when running)

## Testing

```bash
# Backend unit tests
cd backend
dotnet test

# Manual API testing
# Open backend/auth.http in VS Code with REST Client extension
```

## Environment Variables

See [.env.example](.env.example) for all required variables.

## License

Private — All rights reserved.
