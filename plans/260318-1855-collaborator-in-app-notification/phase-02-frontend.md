---
phase: 2
status: pending
priority: high
---

# Phase 2: Frontend — NotificationBell Accept/Decline

## Overview
Add inline accept/decline buttons in NotificationBell dropdown. Add polling interval. Update TypeScript types.

## Related Code Files

### Modify
- `frontend/src/types/organizer.ts` — add `inviteToken` to `CollaborationEvent`
- `frontend/src/components/layout/notification-bell.tsx` — add accept/decline buttons
- `frontend/src/hooks/use-collaborators.ts` — add `refetchInterval` to `useMyCollaborations`

## Implementation Steps

### 1. Update CollaborationEvent type
**File:** `organizer.ts`

```typescript
export interface CollaborationEvent {
  eventId: string;
  title: string;
  venue?: string;
  startAt: string;
  endAt: string;
  status: string;
  permissionLevel: CollaboratorPermissionLevel;
  collaboratorStatus: CollaboratorStatus;
  inviteToken?: string;  // NEW
}
```

### 2. Add polling to useMyCollaborations
**File:** `use-collaborators.ts`

```typescript
export function useMyCollaborations() {
  return useQuery({
    queryKey: myCollaborationsKey,
    queryFn: getMyCollaborations,
    refetchInterval: 30_000,  // poll every 30s
  });
}
```

### 3. Add accept/decline to NotificationBell
**File:** `notification-bell.tsx`

Replace the current navigate-only button with:
- Event title + permission badge (keep existing)
- Two small buttons: "Chấp nhận" (accept) + "Từ chối" (decline)
- Use `useAcceptCollaboratorInvite` and `useDeclineCollaboratorInvite` hooks
- Show loading state on buttons during mutation
- Invalidate `myCollaborationsKey` on success
- Toast on success/error

Key UX:
- Accept → green button, Decline → ghost/text button
- After action, item disappears from dropdown (query invalidation)
- Keep "Xem tất cả lời mời" footer link

## Todo List
- [ ] Add `inviteToken` to `CollaborationEvent` type
- [ ] Add `refetchInterval: 30_000` to `useMyCollaborations`
- [ ] Add accept/decline buttons to NotificationBell items
- [ ] Wire up mutations with query invalidation
- [ ] Test inline accept/decline flow
- [ ] Verify no lint errors

## Success Criteria
- NotificationBell shows pending invites with accept/decline buttons
- Clicking accept/decline works inline without page navigation
- Dropdown updates immediately after action
- Polls every 30s for new invites
