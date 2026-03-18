# Phase 7: Frontend Collaborator Access

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Collaborator-facing pages: invite acceptance, event-scoped access based on permission level

## Related Files

**Create:**
- `frontend/src/app/(app)/invite/[token]/page.tsx` — Invite acceptance page
- `frontend/src/app/(organizer)/organizer/events/[id]/collaborate/page.tsx` — Collaborator event view
- `frontend/src/components/collaborator/collaborator-event-dashboard.tsx` — Event overview for collaborators
- `frontend/src/components/collaborator/collaborator-checkin.tsx` — QR check-in (Operator+)
- `frontend/src/components/collaborator/collaborator-posts.tsx` — Post management (Manager only)
- `frontend/src/hooks/use-my-collaborations.ts` — TanStack Query hook

**Modify:**
- `frontend/src/components/layout/navigation-bar.tsx` — Add "My Collaborations" link for users with active collaborations
- `frontend/src/app/(organizer)/organizer/events/[id]/checkin/page.tsx` — Allow collaborator access (Operator+)

## Implementation Steps

### 1. Invite Acceptance Page
- Route: `/invite/[token]`
- Flow: show event info + permission level → Accept / Decline buttons
- If not logged in: redirect to login with returnUrl=/invite/[token]
- On accept: POST /api/collaborators/accept → redirect to collaboration dashboard

### 2. Collaborator Event Dashboard
- Shows event overview, stats based on permission level
- **Viewer**: event info, attendance stats, attendee list (read-only)
- **Operator**: + QR check-in scanner, ticket verification
- **Manager**: + post creation/editing, send notifications

### 3. Permission-Gated UI
```typescript
// Render sections based on permission level
{permissionLevel >= "Operator" && <CheckInSection />}
{permissionLevel === "Manager" && <PostsSection />}
```

Use numeric comparison: Viewer=0, Operator=1, Manager=2

### 4. My Collaborations Page
- User dashboard shows list of events they collaborate on
- Quick access to each event's collaboration dashboard
- Show permission level badge per event

### 5. Check-in Integration
- Reuse existing check-in component from organizer pages
- Collaborators with Operator+ access same QR scanner
- Authorization checked server-side via EventCollaborator permission

## Todo

- [ ] Create invite acceptance page (/invite/[token])
- [ ] Create collaborator event dashboard
- [ ] Create permission-gated check-in component
- [ ] Create permission-gated posts component
- [ ] Create my-collaborations hook
- [ ] Update navigation for collaborators
- [ ] Update existing check-in page for collaborator access
- [ ] Test invite flow end-to-end
- [ ] Test permission level gating

## Success Criteria

- Invite acceptance flow works (email link → login → accept → dashboard)
- Share link invite works (open link → login → accept → dashboard)
- Permission levels correctly gate UI sections
- Collaborators cannot create events or access organizer-only features
- QR check-in works for Operator+ collaborators
