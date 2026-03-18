---
title: "Add City field to Event entity"
description: "Add City column to Event, expose in API DTOs, wire frontend wizard submit"
status: pending
priority: P2
effort: 1.5h
branch: main
tags: [backend, frontend, database, event]
created: 2026-03-08
---

# Add City Field to Event Entity

Simple additive change: new nullable `City` string on Event, exposed through API and consumed by frontend wizard.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [DB Migration](phase-01-db-migration.md) | pending | 30min |
| 2 | [Backend API](phase-02-backend-api.md) | pending | 30min |
| 3 | [Frontend](phase-03-frontend.md) | pending | 20min |

## Key Facts

- `City` is nullable string, max 200 chars
- Frontend wizard already captures city but drops it on submit
- Location filter should match City OR Venue
- No breaking changes; purely additive

## Dependencies

- Phase 2 depends on Phase 1 (migration must exist)
- Phase 3 depends on Phase 2 (API must accept city)
