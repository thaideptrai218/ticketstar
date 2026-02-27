# Code Reviewer Agent Memory

## Project Context

- **Stack:** .NET 8 backend (Clean Architecture: API/Application/Domain/Infrastructure), Next.js 15 frontend
- **DB:** MySQL 8 (Pomelo EF Core), Redis 7, RabbitMQ 3
- **Auth:** Custom JWT + refresh token rotation + Google OAuth + Magic Links (no ASP.NET Identity)
- **Current phase:** Phase 2 complete (Database & Identity), Phase 3 (Backend API) pending

## Architecture

- Four-layer: `TicketStar.API` > `TicketStar.Application` > `TicketStar.Domain` < `TicketStar.Infrastructure`
- Application currently has direct reference to Infrastructure (known tech debt)
- Services use `AppDbContext` directly (pre-repository pattern)
- Security services (Argon2, SHA256, CSPRNG) are singletons; business services are scoped

## Key File Paths

- Backend root: `/home/welterial/projects/ticketstar/backend/`
- Solution: `/home/welterial/projects/ticketstar/backend/TicketStar.sln`
- Program.cs: `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Program.cs`
- AuthService: `/home/welterial/projects/ticketstar/backend/src/TicketStar.Application/Services/AuthService.cs`
- Docs: `/home/welterial/projects/ticketstar/docs/`
- Plans: `/home/welterial/projects/ticketstar/plans/`
- Reports: `/home/welterial/projects/ticketstar/plans/reports/`

## Review Patterns Found

- Services throw exceptions for business logic (should use Result pattern)
- Controllers catch exceptions with try/catch (should use FromResult)
- No input validation on DTOs beyond EF constraints
- No structured logging or correlation IDs
- No health check endpoints
- Config uses magic strings (`_config["Jwt:Secret"]`) instead of Options pattern
- 35 unit tests exist (security services only)

## Conventions

- C# files: PascalCase
- Commit format: conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Code files under 200 lines
- Reports naming: `{role}-{date}-{time}-{slug}.md`
