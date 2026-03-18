# Brainstorm: Role Consolidation & Organizer Refactor

## Problem Statement

Current RBAC has 4 roles (User, Staff, Organizer, Admin) with overlapping concerns. Staff role tightly coupled to UserRole enum but functionally is event-scoped. Organizer is both a role and a flag (`IsOrganizer`). Need simplification: merge Staff/Organizer functionality, use flag-based organizer promotion, event-scoped collaborator permissions.

## Current State

- **UserRole enum**: User=0, Staff=1, Organizer=2, Admin=3
- **IsOrganizer flag**: Already exists on User entity
- **StaffAssignment table**: Links User→Event with AssignedBy/AssignedAt
- **Frontend guards**: ProtectedRoute, OrganizerRoute, StaffRoute

## Agreed Solution

### 1. Simplified Role Model

**UserRole enum** → `User=0, Admin=1` (remove Staff, Organizer)

**Organizer capability** → `IsOrganizer` flag on User + new `OrganizerProfile` table. User must complete OrganizerProfile before creating events.

**Collaborator system** → Replaces Staff role entirely. Event-scoped, invitation-based.

### 2. OrganizerProfile Table

```
OrganizerProfile
├── Id (PK)
├── UserId (FK → User, unique)
├── OrganizationName (required)
├── Description
├── LogoUrl
├── Phone
├── Address
├── Website
├── FacebookUrl
├── InstagramUrl
├── CreatedAt
└── UpdatedAt
```

**Flow**: User wants to create event → check `IsOrganizer` → if false, redirect to "Complete Organizer Profile" form → save profile + set `IsOrganizer=true` → can now create events.

### 3. Collaborator System (Replaces Staff)

**Rename** `StaffAssignment` → `EventCollaborator`

```
EventCollaborator
├── Id (PK)
├── UserId (FK → User, nullable until accepted)
├── EventId (FK → Event)
├── Email (for invite before user exists/accepts)
├── PermissionLevel (enum: Viewer=0, Operator=1, Manager=2)
├── InviteToken (for link-based invite)
├── InvitedBy (FK → User)
├── InvitedAt
├── AcceptedAt (nullable)
├── Status (enum: Pending, Accepted, Declined, Revoked)
└── UpdatedAt
```

**Permission Levels**:
| Level | Capabilities |
|-------|-------------|
| Viewer | View event overview, stats, attendee list |
| Operator | + QR scan check-in, view ticket details |
| Manager | + Manage posts/announcements, send notifications |

**Invite Flow**:
- **Email**: Organizer enters email → system sends invite email with token → recipient clicks → accept/decline
- **Link**: Organizer generates invite link with token → share anywhere → anyone with link can accept
- Only event organizer (or Admin) can invite

### 4. Frontend Architecture

**Route Structure**:
```
/(public)         → Landing, event browsing, ticket purchase
/(auth)           → Login, register
/(user)           → User dashboard, tickets, profile
/(organizer)      → Organizer dashboard (requires IsOrganizer)
  /events         → Event CRUD
  /collaborators  → Manage collaborators across events
  /analytics      → Sales stats, attendance
  /campaigns      → Email campaigns
  /settings       → Organizer profile settings
/(admin)          → Admin panel (requires Admin role)
```

**Route Guards**:
- `ProtectedRoute` → authenticated
- `OrganizerRoute` → authenticated + `isOrganizer === true`
- `AdminRoute` → authenticated + `role === "Admin"`
- Remove `StaffRoute` entirely

**Collaborator Access**: Collaborators access event-scoped pages via `/events/:id/collaborate` — no separate layout needed. Permission checks per-page based on their `PermissionLevel`.

### 5. Backend Changes

**Remove**: Staff-related controllers, StaffRoute guard, Staff enum value

**Modify**:
- `UserRole` enum: only User, Admin
- `User` entity: keep IsOrganizer, add OrganizerProfile nav
- Rename StaffAssignment → EventCollaborator with new fields
- Auth endpoints: remove staff-specific logic

**Add**:
- `OrganizerProfile` entity + repository
- `EventCollaborator` entity + repository
- `CollaboratorPermissionLevel` enum
- `CollaboratorStatus` enum
- Collaborator invitation service (email + link)
- Collaborator authorization middleware/service

### 6. Migration Strategy

1. Create OrganizerProfile table
2. Migrate existing users with `IsOrganizer=true` → create empty OrganizerProfile (mark as incomplete)
3. Rename StaffAssignment → EventCollaborator, add new columns
4. Migrate existing Staff role users → set role=User, create EventCollaborator entries for their assigned events
5. Remove Staff/Organizer from UserRole enum
6. Update all authorization checks

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Existing Staff users lose access | Migration creates EventCollaborator entries preserving their event assignments |
| OrganizerProfile blocks event creation | Clear UX: one-time form with progress indicator |
| Permission level confusion | Simple 3-tier model with clear labels in UI |
| Invite link abuse | Token expiry (72h), single-use, revocable by organizer |

## Success Criteria

- [ ] Only 2 roles in enum: User, Admin
- [ ] IsOrganizer flag + OrganizerProfile gates event creation
- [ ] Collaborator system with 3 permission levels replaces Staff
- [ ] Email + link invitation working
- [ ] All existing Staff users migrated to collaborators
- [ ] Frontend routes consolidated (no StaffRoute)

## Unresolved Questions

1. Should invite links expire? Suggested: 72h default, configurable by organizer
2. Max collaborators per event? Unlimited or capped?
3. Can a collaborator be promoted/demoted after accepting? (Suggested: yes, by organizer)
4. Email campaign feature scope — simple blast or template-based? (Defer to implementation phase)
