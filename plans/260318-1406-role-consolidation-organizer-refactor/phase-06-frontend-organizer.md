# Phase 6: Frontend Organizer Dashboard

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Organizer profile form, collaborator management UI, dashboard sidebar with full suite

## Related Files

**Modify:**
- `frontend/src/app/(organizer)/layout.tsx` — Add sidebar navigation
- `frontend/src/app/(app)/become-organizer/page.tsx` — Convert to organizer profile creation form
- `frontend/src/components/organizer/staff-management.tsx` → Rename to `collaborator-management.tsx`
- `frontend/src/app/(organizer)/organizer/events/[id]/staff/page.tsx` → Rename to collaborators

**Create:**
- `frontend/src/components/organizer/organizer-sidebar.tsx` — Sidebar nav
- `frontend/src/components/organizer/organizer-profile-form.tsx` — Profile creation/edit form
- `frontend/src/components/organizer/collaborator-invite-dialog.tsx` — Email + link invite UI
- `frontend/src/components/organizer/collaborator-table.tsx` — Collaborator list with permission management
- `frontend/src/app/(organizer)/organizer/settings/page.tsx` — Organizer profile settings
- `frontend/src/app/(organizer)/organizer/collaborators/page.tsx` — Cross-event collaborator overview
- `frontend/src/app/(organizer)/organizer/analytics/page.tsx` — Sales/attendance stats (placeholder)
- `frontend/src/app/(organizer)/organizer/campaigns/page.tsx` — Email campaigns (placeholder)
- `frontend/src/hooks/use-organizer-profile.ts` — TanStack Query hook
- `frontend/src/hooks/use-collaborators.ts` — TanStack Query hook
- `frontend/src/lib/api/organizer-profile-api.ts` — API client functions
- `frontend/src/lib/api/collaborator-api.ts` — API client functions

## Implementation Steps

### 1. Organizer Sidebar
Navigation items:
- Dashboard (overview)
- Events (list/create)
- Collaborators (cross-event view)
- Analytics (sales stats)
- Campaigns (email)
- Settings (profile)

### 2. Organizer Profile Form (become-organizer → settings)
- Fields: OrganizationName*, Description, Logo upload, Phone, Address, Website, Facebook, Instagram
- On submit: POST /api/organizer-profile → sets IsOrganizer=true → redirect to organizer dashboard
- Reuse form in /organizer/settings for editing

### 3. Collaborator Management
Replace staff-management.tsx:
- Invite by email: dialog with email + permission level dropdown
- Generate invite link: dialog showing copyable link + QR
- Collaborator table: email, name, permission level, status, actions (edit level, revoke)
- Permission level dropdown: Viewer / Operator / Manager with descriptions

### 4. API Client Functions
```typescript
// organizer-profile-api.ts
getMyProfile(): Promise<OrganizerProfile>
createProfile(data: CreateProfileRequest): Promise<OrganizerProfile>
updateProfile(data: UpdateProfileRequest): Promise<OrganizerProfile>
uploadLogo(file: File): Promise<{ logoUrl: string }>

// collaborator-api.ts
getEventCollaborators(eventId: string): Promise<Collaborator[]>
inviteByEmail(eventId: string, data: InviteRequest): Promise<Collaborator>
generateInviteLink(eventId: string, data: InviteLinkRequest): Promise<InviteLink>
updatePermission(eventId: string, id: string, data: UpdateRequest): Promise<Collaborator>
removeCollaborator(eventId: string, id: string): Promise<void>
getMyCollaborations(): Promise<CollaborationEvent[]>
acceptInvite(token: string): Promise<Collaborator>
declineInvite(token: string): Promise<void>
```

### 5. Placeholder Pages
- Analytics: basic layout with "Coming soon" or simple event stats if data available
- Campaigns: basic layout with "Coming soon"

## Todo

- [ ] Create organizer-sidebar.tsx
- [ ] Update organizer layout with sidebar
- [ ] Create organizer-profile-form.tsx
- [ ] Update become-organizer page to use profile form
- [ ] Create organizer settings page
- [ ] Create collaborator-invite-dialog.tsx
- [ ] Create collaborator-table.tsx
- [ ] Rename staff-management → collaborator-management
- [ ] Rename staff page → collaborators page
- [ ] Create API client functions
- [ ] Create TanStack Query hooks
- [ ] Create analytics placeholder page
- [ ] Create campaigns placeholder page
- [ ] Create cross-event collaborators page
- [ ] Verify all pages render

## Success Criteria

- Organizer profile form creates profile and enables event creation
- Collaborator invite works via email and link
- Permission levels visible and editable in UI
- Sidebar navigation works across all organizer pages
- No references to "staff" in organizer UI
