# Justfile Command Test Report
Date: 2026-03-01 | Project: TicketStar

## Test Results Overview

| Command | Status | Notes |
|---|---|---|
| `just` | PASS | Lists all 22 recipes correctly |
| `just restore` | PASS | All packages up-to-date |
| `just install` | PASS | pnpm deps already up-to-date (1s) |
| `just build-backend` | PASS | All 4 projects built, 0 warnings, 0 errors |
| `just build-frontend` | PASS | Next.js 16.1.6 optimized production build |
| `just test` | PASS | 95/95 passed, 0 failed, 0 skipped |
| `just lint` | PASS | ESLint clean, no errors |
| `just infra` | PASS | MySQL + RabbitMQ + Redis all healthy |
| `just health` | N/A | Backend API not running (no output, not an error) |

---

## Detailed Results

### `just` (default)
- Lists 22 recipes with descriptions
- PASS

### `just restore`
- `dotnet restore` - all projects up-to-date
- Time: ~2s
- PASS

### `just install`
- `pnpm install` - lockfile current, no changes
- pnpm v10.26.1 (minor: update available 10.30.3, non-blocking)
- Time: 1s
- PASS

### `just build-backend`
- Builds: Domain, Infrastructure, Application, API
- **0 warnings, 0 errors**
- Time: ~3s
- PASS

### `just build-frontend`
- Next.js 16.1.6 Turbopack build
- TypeScript check: passed
- Static pages generated: 4/4
- Routes: `/`, `/_not-found` (static)
- Time: ~4s total
- PASS

### `just test`
- `dotnet test` in `/backend`
- Total: **95 passed, 0 failed, 0 skipped**
- Duration: 8s
- PASS

### `just lint`
- `pnpm lint` → ESLint
- No errors, no warnings output
- PASS

### `just infra`
- Docker Compose up -d
- ticketstar-mysql: healthy (port 3307)
- ticketstar-redis: healthy (port 6380)
- ticketstar-rabbitmq: healthy (ports 5672, 15672)
- PASS

### `just health`
- Backend API at port 5010 not running (not started in this session)
- `curl` returned empty — connection refused silently due to `head -1` suppressing error
- N/A (not a justfile bug; expected when API process not started)

---

## Build Status
- Backend: SUCCESS (0 warnings)
- Frontend: SUCCESS (clean TypeScript, clean compile)

## Performance
- `build-backend`: ~3s
- `build-frontend`: ~4s
- `test`: 8s for 95 tests (~85ms avg/test)

## Critical Issues
None.

## Recommendations
1. `just health` silently returns nothing when backend is down — consider adding error message or connection check
2. pnpm update available (10.26.1 → 10.30.3) — non-blocking cosmetic notice
3. Frontend only has 2 routes (`/`, `/_not-found`) — likely still in early dev; coverage will grow

## Unresolved Questions
- None
