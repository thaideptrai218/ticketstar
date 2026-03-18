# Phase 4: Backend API Controllers

## Overview
- **Priority:** P0
- **Status:** pending
- **Description:** Update/create controllers, update auth middleware, Program.cs

## Related Files

**Modify:**
- `backend/src/TicketStar.API/Controllers/AdminController.cs` — Remove organizer grant/revoke endpoints (or keep revoke for admin)
- `backend/src/TicketStar.API/Program.cs` — Update DI registrations, remove staff service references
- `backend/src/TicketStar.Infrastructure/Data/DbSeeder.cs` — Update seed data for new roles

**Create:**
- `backend/src/TicketStar.API/Controllers/OrganizerProfileController.cs`
- `backend/src/TicketStar.API/Controllers/CollaboratorController.cs`

**Delete:**
- `backend/src/TicketStar.API/Controllers/StaffController.cs`

## Implementation Steps

### 1. OrganizerProfileController
```
[Authorize]
[Route("api/organizer-profile")]

GET  /api/organizer-profile        → Get current user's profile
POST /api/organizer-profile        → Create profile (sets IsOrganizer=true)
PUT  /api/organizer-profile        → Update profile
POST /api/organizer-profile/logo   → Upload logo
```

### 2. CollaboratorController
```
[Authorize]
[Route("api/events/{eventId}/collaborators")]

GET    /                           → List event collaborators
POST   /invite                     → Invite by email
POST   /invite-link                → Generate invite link
PUT    /{collaboratorId}           → Update permission level
DELETE /{collaboratorId}           → Remove collaborator

[Route("api/collaborators")]
GET    /my                         → List my collaborations
POST   /accept                     → Accept invite (by token)
POST   /decline                    → Decline invite (by token)
```

### 3. Update AdminController
- Remove `POST /api/admin/users/{id}/grant-organizer` (users self-promote via profile)
- Keep `POST /api/admin/users/{id}/revoke-organizer` — admin safety override
- Update user list response to not include Staff/Organizer role labels

### 4. Delete StaffController
- Remove entire `StaffController.cs`
- Remove staff route registrations from Program.cs

### 5. Update Program.cs
- Register new services: IOrganizerProfileService, ICollaboratorService
- Register new repositories: IOrganizerProfileRepository, IEventCollaboratorRepository
- Remove: IStaffService, IStaffAssignmentRepository registrations

### 6. Update DbSeeder
- Seed admin user with Role=Admin (not "3")
- Remove any staff/organizer seed data

## Todo

- [ ] Create OrganizerProfileController
- [ ] Create CollaboratorController
- [ ] Update AdminController
- [ ] Delete StaffController
- [ ] Update Program.cs DI
- [ ] Update DbSeeder
- [ ] Test all endpoints compile
- [ ] Verify `just build` succeeds

## Success Criteria

- All new endpoints respond correctly
- No 500 errors from missing DI registrations
- StaffController fully removed
- Backend builds and starts cleanly
