# Code Review Report: Phase 1 Project Scaffolding

**Date:** 2026-02-26
**Reviewer:** code-reviewer
**Scope:** Docker, .NET solution, Next.js scaffolding
**Files Reviewed:** 8 core files

---

## Overall Assessment

**Score: 7/10**

Project scaffolding is functional with clean architecture. Both backend and frontend build successfully. Docker Compose properly configured with health checks.

**Status:** APPROVED with minor fixes required

---

## Critical Issues

### 1. Hardcoded Credentials in appsettings.json (SECURITY)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/appsettings.json`

**Problem:**
```json
"ConnectionStrings": {
  "MySqlConnection": "Server=localhost;Port=3307;Database=ticketstar;User=root;Password=ticketstar_dev;",
}
```

Hardcoded password in connection string. Plan specifies `.env` file for secrets but this wasn't applied consistently.

**Impact:**
- Credentials committed to git (security risk)
- Dev/prod config mixed
- Violates plan specification

**Fix Required:**
1. Remove hardcoded password from appsettings.json
2. Use environment variable: `Password=${MYSQL_ROOT_PASSWORD}`
3. Ensure `.env` file is gitignored (already done)

---

### 2. Empty Redis Password (SECURITY)

**File:** `/home/welterial/projects/ticketstar/.env`

**Problem:**
```env
REDIS_PASSWORD=
```

Redis running without authentication in dev mode. While acceptable for local dev, should be documented.

**Impact:**
- Unprotected Redis instance
- Risk in shared environments

**Recommendation:**
- Set a dev password or add comment: `# Empty for local dev only - set in production`

---

## High Priority Issues

### 3. Missing .env.example (DX)

No template file showing required environment variables. New developers won't know what to configure.

**Fix Required:**
Create `.env.example`:
```env
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=ticketstar
REDIS_PASSWORD=your_redis_password
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
JWT_SECRET=your_jwt_secret_min_256_bits
```

---

### 4. CORS Configuration (SECURITY)

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Program.cs`

**Current:**
```csharp
policy.WithOrigins("http://localhost:3001")
```

**Good:** Single origin restriction
**Missing:** No production config pattern

**Recommendation:**
Add environment-based origin config:
```csharp
var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? "http://localhost:3001";
policy.WithOrigins(frontendOrigin)
```

---

### 5. Program.cs Missing Kestrel URL Configuration

**File:** `/home/welterial/projects/ticketstar/backend/src/TicketStar.API/Program.cs`

Plan specifies Kestrel should listen on port 5010, but this is only in appsettings.json. Program.cs should verify or configure explicitly.

**Current Issue:** Default Kestrel behavior may override appsettings.

**Verify:** Test that API actually runs on port 5010.

---

## Medium Priority Issues

### 6. Docker Compose Missing restart: unless-stopped

**File:** `/home/welterial/projects/ticketstar/docker-compose.yml`

Services don't auto-restart on failure. For dev environment, this is acceptable but should be intentional.

**Optional Enhancement:**
```yaml
services:
  mysql:
    restart: unless-stopped
```

---

### 7. Next.js 16 vs Plan Specification 15

**File:** `/home/welterial/projects/ticketstar/frontend/package.json`

Plan specified Next.js 15, but got 16.1.6. This is newer (better), but plan should be updated or spec clarified.

**Impact:** Minor - newer version is compatible

---

### 8. Missing Network Configuration in Docker Compose

**File:** `/home/welterial/projects/ticketstar/docker-compose.yml**

Services on default network. For better isolation:

```yaml
networks:
  ticketstar-net:
    driver: bridge

services:
  mysql:
    networks:
      - ticketstar-net
```

---

## Low Priority Issues

### 9. .gitignore Minor Improvement

Add NuGet package lock pattern:
```
# NuGet
*.nuget.props
packages/
```

---

### 10. Test Project Missing Domain Reference

**File:** `/home/welterial/projects/ticketstar/backend/tests/TicketStar.Tests/TicketStar.Tests.csproj`

Tests reference API, Application, Infrastructure but not Domain.

**Impact:** Can't test Domain entities directly

**Fix:**
```xml
<ProjectReference Include="..\..\src\TicketStar.Domain\TicketStar.Domain.csproj" />
```

---

## Positive Observations

1. **Clean Architecture** - Proper 4-layer separation (API, Application, Domain, Infrastructure)
2. **Project References** - Correct dependency directions (no circular refs)
3. **Docker Health Checks** - All services have healthcheck configured
4. **Port Remapping** - Correctly uses alternate ports (3001, 5010, 3307, 6380)
5. **Type Safety** - .NET nullable enabled, TypeScript strict mode on
6. **Build Success** - Both dotnet build and pnpm build pass with 0 errors
7. **Git Ignore** - Proper exclusions for .env, node_modules, bin/obj

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded secrets | FAIL | MySQL password in appsettings.json |
| .env gitignored | PASS | |
| CORS restricted | PASS | Single origin |
| Redis authenticated | PARTIAL | Empty password for dev |
| JWT secret externalized | PASS | Uses ${JWT_SECRET} |
| Docker rootless | N/A | Not applicable |
| HTTPS in production | TODO | HTTP-only for dev (documented) |

---

## Configuration Validation

| Service | Port | Config | Status |
|---------|------|--------|--------|
| MySQL | 3307 | docker-compose.yml | PASS |
| Redis | 6380 | docker-compose.yml | PASS |
| RabbitMQ | 5672/15672 | docker-compose.yml | PASS |
| API | 5010 | appsettings.json | UNVERIFIED |
| Frontend | 3001 | package.json | PASS |

---

## Edge Cases Analysis

### 1. Container Startup Race Conditions
Docker Compose has no `depends_on` with health conditions. Services may start before DB is ready.

**Mitigation:** Health checks present, but app startup could fail.

### 2. Port Conflicts on Host
If host ports 3001, 5010, 3307, 6380, 5672, 15672 are occupied.

**Mitigation:** Documented in plan, but no runtime validation.

### 3. Environment Variable Not Set
If `.env` missing, Docker Compose fails fast (good). But appsettings.json has fallback hardcoded values (bad).

---

## Package Versions

| Package | Version | Status |
|---------|---------|--------|
| .NET | 8.0 | PASS (LTS) |
| Pomelo EF MySQL | 8.0.3 | PASS (compatible) |
| MassTransit RabbitMQ | 8.3.4 | PASS |
| Next.js | 16.1.6 | PASS (newer than plan) |
| React | 19.2.3 | PASS |

---

## Recommended Actions

### Must Fix (Before Commit)
1. Remove hardcoded MySQL password from appsettings.json
2. Create .env.example file

### Should Fix (Soon)
3. Add CORS origin environment variable
4. Add Domain reference to test project
5. Verify API runs on port 5010 as configured

### Nice to Have
6. Add Docker networks
7. Add restart policies to services
8. Update plan to reflect Next.js 16

---

## Unresolved Questions

1. **Why no explicit `appsettings.Development.json`?** Plan mentioned it but not created.
2. **Is Kestrel port 5010 actually working?** Needs runtime verification.
3. **Any intention to use `user-secrets` for local dev?** Not configured.
4. **RabbitMQ management UI credentials** documented for team?

---

## Files Reviewed

```
docker-compose.yml                           ✅ HEALTHY
.gitignore                                   ✅ GOOD
backend/TicketStar.sln                       ✅ GOOD
backend/src/TicketStar.API/Program.cs        ⚠️  MISSING KESTREL CONFIG
backend/src/TicketStar.API/appsettings.json  ❌ HARDCODED PASSWORD
backend/src/TicketStar.API/*.csproj          ✅ GOOD
backend/src/TicketStar.Application/*.csproj  ✅ GOOD
backend/src/TicketStar.Domain/*.csproj       ✅ GOOD
backend/src/TicketStar.Infrastructure/*.csproj ✅ GOOD
backend/tests/TicketStar.Tests/*.csproj      ⚠️  MISSING DOMAIN REF
frontend/package.json                        ✅ GOOD
frontend/tsconfig.json                       ✅ GOOD
frontend/.env.local                         ✅ GOOD
```

---

## Build Verification

```bash
# Backend
cd backend && dotnet build
Result: ✅ SUCCESS - 0 warnings, 0 errors

# Frontend
cd frontend && pnpm build
Result: ✅ SUCCESS - 4 pages generated

# Docker
docker compose up -d
Result: ⚠️  NOT TESTED (requires .env file presence)
```

---

## Conclusion

Scaffolding meets requirements with critical security issue (hardcoded password) that must be fixed before commit. Architecture sound, builds passing, Docker properly configured.

**Recommendation:** Fix hardcoded password, add .env.example, then commit.

**Score Breakdown:**
- Architecture: 9/10 (clean separation)
- Security: 4/10 (hardcoded secrets)
- Configuration: 7/10 (minor gaps)
- Code Quality: 9/10 (clean, follows standards)
- Documentation: 6/10 (missing .env.example)

**Overall: 7/10**
