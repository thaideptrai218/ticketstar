---
status: completed
created: 2026-03-18
branch: main
---

# Role Consolidation & Organizer Refactor

## Summary

Simplify RBAC from 4 roles → 2 (User, Admin). Add OrganizerProfile table. Replace Staff with event-scoped EventCollaborator system (3 permission levels). Email + link invitations.

## Context

- [Brainstorm Report](../reports/brainstorm-260318-1406-role-consolidation-organizer-refactor.md)

## Phases

| # | Phase | Status | Priority | Effort |
|---|-------|--------|----------|--------|
| 1 | [Backend Domain Changes](phase-01-backend-domain.md) | completed | P0 | M |
| 2 | [Backend Infrastructure & Migration](phase-02-backend-infrastructure.md) | completed | P0 | L |
| 3 | [Backend Application Layer](phase-03-backend-application.md) | completed | P0 | L |
| 4 | [Backend API Controllers](phase-04-backend-api.md) | completed | P0 | M |
| 5 | [Frontend Auth & Types Cleanup](phase-05-frontend-auth.md) | completed | P0 | M |
| 6 | [Frontend Organizer Dashboard](phase-06-frontend-organizer.md) | completed | P1 | L |
| 7 | [Frontend Collaborator Access](phase-07-frontend-collaborator.md) | completed | P1 | M |

## Dependencies

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 (sequential backend)
Phase 5 (can start after Phase 4)
Phase 6 → Phase 7 (sequential frontend, after Phase 5)
```

## Key Decisions

- UserRole enum: User=0, Admin=1 (remove Staff=1, Organizer=2; remap Admin from 3→1)
- OrganizerProfile: separate table, 1:1 with User, required before event creation
- EventCollaborator: replaces StaffAssignment, adds PermissionLevel + Status + InviteToken
- Collaborator permissions: Viewer(0), Operator(1), Manager(2)
- Invite via email + shareable link (token-based, 72h expiry)
