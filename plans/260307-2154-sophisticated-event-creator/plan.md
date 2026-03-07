---
title: "Sophisticated Event Creator Wizard"
description: "4-step wizard (Event Info, Time & Tickets, Settings, Payment) replacing basic form, with image upload, rich text, and inline ticket management."
status: pending
priority: P1
effort: 16h
issue:
branch: main
tags: [feature, frontend, backend, database]
created: 2026-03-07
---

# Sophisticated Event Creator Wizard

## Overview

Replace the basic single-page event form with a TicketBox-style 4-step wizard.
Full requirements in: `plans/reports/brainstorm-260307-2154-sophisticated-event-creator.md`

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | DB Migration | Pending | 2h | [phase-01](./phase-01-db-migration.md) |
| 2 | Backend API | Pending | 4h | [phase-02-backend-api.md](./phase-02-backend-api.md) |
| 3 | Frontend Wizard | Pending | 7h | [phase-03-frontend-wizard.md](./phase-03-frontend-wizard.md) |
| 4 | Pages & Integration | Pending | 3h | [phase-04-pages-integration.md](./phase-04-pages-integration.md) |

## Dependencies

```
Phase 1 (DB) → Phase 2 (Backend API) → Phase 3 (Frontend) → Phase 4 (Integration)
```

Phase 3 frontend components can be scaffolded in parallel with Phase 2, but integration requires Phase 2 complete.

## Key Files Changed

**Backend:** `Event.cs`, `TicketType.cs`, `EventDtos.cs`, `EventsController.cs`, `EventService.cs`, `Program.cs`
**Frontend:** new `components/organizer/event-wizard/` module, `events/new/page.tsx`, `events/[id]/edit/page.tsx`, `events/page.tsx`

## Notes

- `CreateTicketTypeRequest` already has `Description` and `MaxPerUser` fields in DTOs — entity is missing them (existing bug, fix in Phase 1)
- `SaleStartAt`/`SaleEndAt` exist on entity but NOT in `CreateTicketTypeRequest` DTO — add in Phase 2
- Publish/unpublish endpoints may already be partially implemented — verify in Phase 2
