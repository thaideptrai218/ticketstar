---
title: "Sophisticated Event Creator Wizard"
description: "4-step wizard (Event Info, Time & Tickets, Settings, Payment) replacing basic form, with image upload, rich text, and inline ticket management."
status: completed
priority: P1
effort: 16h
issue:
branch: main
tags: [feature, frontend, backend, database]
created: 2026-03-07
completed: 2026-03-08
---

# Sophisticated Event Creator Wizard

## Overview

Replace the basic single-page event form with a TicketBox-style 4-step wizard.
Full requirements in: `plans/reports/brainstorm-260307-2154-sophisticated-event-creator.md`

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | DB Migration | Completed | 2h | [phase-01](./phase-01-db-migration.md) |
| 2 | Backend API | Completed | 4h | [phase-02-backend-api.md](./phase-02-backend-api.md) |
| 3 | Frontend Wizard | Completed | 7h | [phase-03-frontend-wizard.md](./phase-03-frontend-wizard.md) |
| 4 | Pages & Integration | Completed | 3h | [phase-04-pages-integration.md](./phase-04-pages-integration.md) |

## Dependencies

```
Phase 1 (DB) → Phase 2 (Backend API) → Phase 3 (Frontend) → Phase 4 (Integration)
```

Phase 3 frontend components can be scaffolded in parallel with Phase 2, but integration requires Phase 2 complete.

## Key Files Changed

**Backend:** `Event.cs`, `TicketType.cs`, `EventDtos.cs`, `EventsController.cs`, `EventService.cs`, `Program.cs`
**Frontend:** new `components/organizer/event-wizard/` module, `events/new/page.tsx`, `events/[id]/edit/page.tsx`, `events/page.tsx`

## Notes

- `CreateTicketTypeRequest` already has `Description` and `MaxPerUser` in DTOs — entity is missing columns (existing bug, fix in Phase 1)
- `TicketTypeResponse` DTO also has `Description`/`MaxPerUser` but entity lacks them — mapping is silently broken (returns null/0)
- `SaleStartAt`/`SaleEndAt` exist on entity but NOT in `CreateTicketTypeRequest` DTO — add in Phase 2
- Publish/unpublish endpoints **confirmed working** — `POST /api/events/{id}/publish` and `/unpublish` with service methods
- Frontend calls backend directly via `NEXT_PUBLIC_API_URL` (no API proxy) — `src/proxy.ts` is auth/RBAC middleware only
- `formatPrice()` already exists in `frontend/src/lib/format-utils.ts` — reuse, don't create `formatVND`
- Existing `ticket-type-form.tsx` dialog component can be adapted/extended for wizard
- `next.config.ts` only allows `images.unsplash.com` — must add backend host for uploaded images
- TanStack Query available (`@tanstack/react-query`) but organizer pages currently use `useState`/`useEffect`
- `types/organizer.ts` has `OrganizerEvent` type that also needs new fields
