# Phase 1 — Project Scaffolding

## Context Links

- [Plan Overview](plan.md)
- [Backend Research](research/researcher-01-backend.md)
- [Frontend Research](research/researcher-02-frontend.md)

## Overview

- **Priority:** P1 (blocks everything)
- **Status:** completed
- **Effort:** 6h
- **Description:** Initialize .NET 8 solution, Next.js 15 project, Docker Compose for infrastructure

## Validated Environment

| Tool    | Version        | Status    |
| ------- | -------------- | --------- |
| .NET    | 8 LTS          | Installed |
| Node.js | 22+            | Installed |
| pnpm    | latest         | Installed |
| Docker  | Running        | Ready     |

## Port Map (all standard ports occupied — using alternates)

| Service     | Port  |
| ----------- | ----- |
| Next.js dev | 3001  |
| ASP.NET API | 5010  |
| MySQL       | 3307  |
| Redis       | 6380  |
| RabbitMQ    | 5672  |
| RabbitMQ UI | 15672 |

## Secrets Management

- Dev secrets via `.env` file (gitignored) + `docker-compose env_file`
- `appsettings.json` references env vars via `${VAR}` or `appsettings.Development.json` reads from env

## Key Insights

- 4-project .NET solution (API, Application, Domain, Infrastructure)
- Next.js with App Router, TypeScript strict mode, pnpm
- Docker Compose for MySQL 8, Redis 7, RabbitMQ 3-management
- HTTP only for local dev (no HTTPS cert setup)

## Requirements

- .NET 8 solution builds and runs
- Next.js dev server starts
- Docker Compose brings up MySQL, Redis, RabbitMQ
- CI-ready structure (clear separation of concerns)

## Architecture

```
ticketstar/
├── backend/
│   ├── TicketStar.sln
│   ├── src/
│   │   ├── TicketStar.API/
│   │   ├── TicketStar.Application/
│   │   ├── TicketStar.Domain/
│   │   └── TicketStar.Infrastructure/
│   └── tests/
│       └── TicketStar.Tests/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
└── .gitignore
```

## Related Code Files

**Create:**

- `backend/TicketStar.sln`
- `backend/src/TicketStar.API/TicketStar.API.csproj` — Web API project
- `backend/src/TicketStar.API/Program.cs` — Entry point, DI config
- `backend/src/TicketStar.API/appsettings.json` — Connection strings, JWT config
- `backend/src/TicketStar.Application/TicketStar.Application.csproj`
- `backend/src/TicketStar.Domain/TicketStar.Domain.csproj`
- `backend/src/TicketStar.Infrastructure/TicketStar.Infrastructure.csproj`
- `backend/tests/TicketStar.Tests/TicketStar.Tests.csproj`
- `frontend/` — Next.js 15 project (via `npx create-next-app@latest`)
- `docker-compose.yml`
- `.gitignore`

## Implementation Steps

### 0. Create root `.env` file

```env
# Docker infra secrets (gitignored)
MYSQL_ROOT_PASSWORD=ticketstar_dev
MYSQL_DATABASE=ticketstar
REDIS_PASSWORD=
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
JWT_SECRET=dev-secret-min-256-bit-change-in-production-!!
```

### 1. Docker Compose

1. Create `docker-compose.yml` with services (alternate ports):
    - `mysql`: image `mysql:8.0`, port **3307:3306**, `env_file: .env`
    - `redis`: image `redis:7-alpine`, port **6380:6379**
    - `rabbitmq`: image `rabbitmq:3-management`, ports 5672, 15672
    - `volumes` for mysql data persistence

### 2. .NET Backend

1. `dotnet new sln -n TicketStar -o backend`
2. Create projects:
    - `dotnet new webapi -n TicketStar.API -o backend/src/TicketStar.API`
    - `dotnet new classlib -n TicketStar.Application -o backend/src/TicketStar.Application`
    - `dotnet new classlib -n TicketStar.Domain -o backend/src/TicketStar.Domain`
    - `dotnet new classlib -n TicketStar.Infrastructure -o backend/src/TicketStar.Infrastructure`
    - `dotnet new xunit -n TicketStar.Tests -o backend/tests/TicketStar.Tests`
3. Add projects to solution
4. Set up project references:
    - API → Application, Infrastructure
    - Application → Domain
    - Infrastructure → Application, Domain
    - Tests → API, Application, Infrastructure
5. Install NuGet packages (API project):
    - `Pomelo.EntityFrameworkCore.MySql` 8.\*
    - `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 8.\*
    - `Microsoft.AspNetCore.Authentication.JwtBearer` 8.\*
    - `StackExchange.Redis` 2.\*
    - `MassTransit.RabbitMQ` 8.\*
    - `QRCoder` 1.6.\*
    - `Swashbuckle.AspNetCore` (already included)
6. Configure `Program.cs` with minimal setup: Swagger, CORS (allow `http://localhost:3001`), controllers
7. Configure `appsettings.json`:
   - Connection strings: MySQL port **3307**, Redis port **6380**, RabbitMQ default
   - JWT config references env var `JWT_SECRET`
   - HTTP only: set Kestrel to listen on `http://localhost:5010`

### 3. Next.js Frontend

1. `pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --src-dir`
2. Install dependencies:
    - `@tanstack/react-query` — client state
    - `react-hook-form` + `@hookform/resolvers` + `zod` — forms
    - `react-qr-code` — QR display
    - `@zxing/browser` + `@zxing/library` — QR scanning
    - `jwt-decode` — middleware token decode
    - `lucide-react` — icons
3. `npx shadcn@latest init` — setup shadcn/ui
4. Install shadcn components: button, input, form, card, badge, dialog, sheet, tabs, table, select, skeleton, avatar, separator
5. Add `sonner` for toast notifications
6. Create folder structure: `components/ui/`, `components/events/`, `components/tickets/`, `components/checkout/`, `components/checkin/`, `lib/`, `hooks/`, `types/`
7. Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5010`
8. Set dev server port in `package.json` dev script: `next dev --port 3001`

### 4. Git Setup

1. Create `.gitignore` covering: .NET bin/obj, node_modules, .env\*, .vs, .idea
2. `git init && git add . && git commit -m "chore: scaffold project structure"`

## Todo List

- [x] Create docker-compose.yml
- [x] Scaffold .NET solution with 4 projects + test project
- [x] Install NuGet packages
- [x] Configure Program.cs (minimal: Swagger, CORS, controllers)
- [x] Configure appsettings.json
- [x] Scaffold Next.js project
- [x] Install npm dependencies
- [x] Initialize shadcn/ui
- [x] Create folder structure
- [x] Verify `docker compose up` works
- [x] Verify `dotnet build` succeeds
- [x] Verify `npm run dev` starts

## Success Criteria

- `docker compose up -d` → all 3 services healthy
- `dotnet build` → 0 errors
- `pnpm dev` → Next.js dev server on **localhost:3001**
- Swagger UI accessible at **localhost:5010/swagger**

## Risk Assessment

- **MySQL version compatibility with Pomelo** — use Pomelo 8.x matching .NET 8
- **Port remapping** — all standard ports occupied; using 3001, 5010, 3307, 6380. RabbitMQ (5672, 15672) unchanged.

## Security Considerations

- `.env` files in `.gitignore`
- No secrets in `appsettings.json` (use user-secrets for dev)
- CORS restricted to frontend origin only

## Next Steps

- Phase 2: Database schema + Identity setup
