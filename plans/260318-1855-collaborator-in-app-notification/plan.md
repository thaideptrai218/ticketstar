---
status: pending
branch: main
created: 2026-03-18
---

# Collaborator In-App Notification Enhancement

## Summary
Enable inline accept/decline of collaborator invites in NotificationBell dropdown. Backend already populates UserId at invite time — main work is DTO expansion + frontend UX.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Backend DTO + Backfill](./phase-01-backend.md) | pending | Small |
| 2 | [Frontend NotificationBell](./phase-02-frontend.md) | pending | Small |

## Dependencies
- Phase 2 depends on Phase 1 (needs inviteToken in DTO)

## Key Insight
`CollaboratorService.InviteByEmailAsync` already sets `UserId = invitedUser?.Id` (line 63). No new entity or migration needed.
