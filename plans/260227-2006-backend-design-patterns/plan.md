# Backend Design Patterns Implementation Plan

**Status:** Pending
**Date:** 2026-02-27
**Branch:** main

---

## Overview

Add production-ready infrastructure patterns to TicketStar backend: Result pattern, API envelope, exception middleware, Options pattern, health checks, DI extensions, pagination, HTTP status codes, and Repository+UoW. Layered architecture preserved with feature-based subdirectories.

## Scope

| # | Pattern | Status |
|---|---------|--------|
| 1 | Result Pattern | Pending |
| 2 | API Response Envelope + ApiControllerBase | Pending |
| 3 | Global Exception Middleware | Pending |
| 4 | Options Pattern (JwtOptions, GoogleAuthOptions) | Pending |
| 5 | Health Checks (/health/live, /health/ready) | Pending |
| 7 | DI Extension Methods (clean Program.cs) | Pending |
| 9 | Pagination (offset + cursor) | Pending |
| 10 | HTTP Status Codes (fix Register→201) | Pending |
| 12 | Repository + UoW (generic + specific) | Pending |

**Deferred:** #6 API Versioning, #8 Problem Details, #11 FluentValidation, #13 MediatR, #14 Domain Events, #15 Correlation IDs, #16 Circuit Breaker, #17 Idempotency, #18 Outbox, #19 Vertical Slices (chose hybrid layered+feature), #20 Minimal APIs

## Architecture Decision

- **Keep layered architecture** (Domain → Application → Infrastructure → API)
- **Add feature subdirectories** within layers: Services/Auth/, Repositories/Auth/, Controllers/Auth/
- Update code-standards.md to reflect feature folder convention

## Implementation Phases

| Phase | Name | File | Blocked By |
|-------|------|------|------------|
| 1 | Common types (Result, ApiResponse, Pagination) | phase-01-common-types.md | — |
| 2 | Options pattern + health checks | phase-02-options-and-health.md | — |
| 3 | Middleware + ApiControllerBase | phase-03-middleware-and-base.md | Phase 1 |
| 4 | Repository + UoW | phase-04-repository-uow.md | — |
| 5 | Refactor services to use Result + Repository | phase-05-refactor-services.md | Phase 1, 3, 4 |
| 6 | DI extensions + Program.cs cleanup | phase-06-di-extensions-program.md | Phase 2, 4, 5 |
| 7 | Update code-standards.md | phase-07-update-docs.md | All |

## NuGet Packages Required

| Package | Project | Purpose |
|---------|---------|---------|
| AspNetCore.HealthChecks.MySql | API | MySQL health check |

No other new packages needed — all patterns are hand-implemented.

## Risk Assessment

- **Refactoring auth services** changes return types (Task<T> → Task<Result<T>>). Tests must update.
- **Repository layer** adds abstraction between services and DbContext. Application project must remove Infrastructure reference and use interfaces only.
- **Breaking change awareness**: interface signatures change, existing 35 tests need update.

---

**Last Updated:** 2026-02-27
