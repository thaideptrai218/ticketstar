# Phase 1 — Project Scaffolding

## Context Links

- [Plan Overview](plan.md)
- [Backend Research](research/researcher-01-backend.md)
- [Frontend Research](research/researcher-02-frontend.md)

## Overview

- **Priority:** P1 (blocks everything)
- **Status:** pending
- **Effort:** 6h
- **Description:** Initialize .NET 8 solution, Next.js 15 project, Docker Compose for infrastructure

## Key Insights

- 4-project .NET solution (API, Application, Domain, Infrastructure)
- Next.js with App Router, TypeScript strict mode
- Docker Compose for MySQL 8, Redis 7, RabbitMQ 3-management

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

### 1. Docker Compose

1. Create `docker-compose.yml` with services:
    - `mysql`: image `mysql:8.0`, port 3306, env `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE=ticketstar`
    - `redis`: image `redis:7-alpine`, port 6379
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
6. Configure `Program.cs` with minimal setup: Swagger, CORS (allow frontend origin), controllers
7. Configure `appsettings.json` with connection strings (MySQL, Redis, RabbitMQ), JWT settings

### 3. Next.js Frontend

1. `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir`
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
7. Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000`

### 4. Git Setup

1. Create `.gitignore` covering: .NET bin/obj, node_modules, .env\*, .vs, .idea
2. `git init && git add . && git commit -m "chore: scaffold project structure"`

## Todo List

- [ ] Create docker-compose.yml
- [ ] Scaffold .NET solution with 4 projects + test project
- [ ] Install NuGet packages
- [ ] Configure Program.cs (minimal: Swagger, CORS, controllers)
- [ ] Configure appsettings.json
- [ ] Scaffold Next.js project
- [ ] Install npm dependencies
- [ ] Initialize shadcn/ui
- [ ] Create folder structure
- [ ] Verify `docker compose up` works
- [ ] Verify `dotnet build` succeeds
- [ ] Verify `npm run dev` starts

## Success Criteria

- `docker compose up -d` → all 3 services healthy
- `dotnet build` → 0 errors
- `npm run dev` → Next.js dev server on localhost:3000
- Swagger UI accessible at localhost:5000/swagger

## Risk Assessment

- **MySQL version compatibility with Pomelo** — use Pomelo 8.x matching .NET 8
- **Port conflicts** — document required ports (3000, 3306, 5000, 5672, 6379, 15672)

## Security Considerations

- `.env` files in `.gitignore`
- No secrets in `appsettings.json` (use user-secrets for dev)
- CORS restricted to frontend origin only

## Next Steps

- Phase 2: Database schema + Identity setup
