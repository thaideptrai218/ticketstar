# Brainstorm: Collaborator In-App Notification Enhancement

**Date:** 2026-03-18
**Status:** Agreed

## Problem
When organizer invites collaborator by email, if that email belongs to existing user, invite should appear in NotificationBell (in-app) in addition to email.

## Decisions
- **Scope:** Event-level only (no org-level invites)
- **Storage:** Query EventCollaborator directly (no new Notification table)
- **Delivery:** Dual channel — both in-app + email for existing users
- **Real-time:** Polling via React Query (no WebSocket/SignalR)
- **Consent:** Explicit accept/decline required (no auto-link)

## Agreed Approach
Minimal enhancement — populate `UserId` on EventCollaborator at invite time when email matches existing user.

### Backend Changes
1. `CollaboratorService.InviteByEmailAsync`: lookup User by email, set UserId if found
2. Backfill logic: on user registration, query EventCollaborator by email where UserId=null, populate UserId

### Frontend Changes
1. NotificationBell: add accept/decline action buttons in dropdown (currently just links)
2. Already queries pending invites by user — works automatically once UserId populated

### Risks
- User registers AFTER invite → UserId=null → mitigated by backfill on registration
- No new tables, endpoints, or infrastructure needed

## Next Steps
Create detailed implementation plan.
