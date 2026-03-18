# Phase 3: Backend Application Layer

## Overview
- **Priority:** P0
- **Status:** pending
- **Description:** Update services, DTOs, interfaces for collaborator + organizer profile

## Related Files

**Modify:**
- `backend/src/TicketStar.Application/Services/AdminService.cs` — Remove GrantOrganizer/RevokeOrganizer (handled by profile now), update user list DTO
- `backend/src/TicketStar.Application/Interfaces/IAdminService.cs` — Remove organizer grant/revoke methods
- `backend/src/TicketStar.Application/Services/EventService.cs` — Add OrganizerProfile check before event creation
- `backend/src/TicketStar.Application/Services/CheckInService.cs` — Replace staff assignment checks → collaborator permission checks
- `backend/src/TicketStar.Application/Services/AuthService.cs` — Update JWT claims (remove Staff/Organizer role references)
- `backend/src/TicketStar.Application/Services/TokenService.cs` — Update role claim generation
- `backend/src/TicketStar.Application/DTOs/EventDtos.cs` — Update if staff references exist

**Create:**
- `backend/src/TicketStar.Application/Interfaces/IOrganizerProfileService.cs`
- `backend/src/TicketStar.Application/Interfaces/ICollaboratorService.cs`
- `backend/src/TicketStar.Application/Services/OrganizerProfileService.cs`
- `backend/src/TicketStar.Application/Services/CollaboratorService.cs`
- `backend/src/TicketStar.Application/DTOs/OrganizerProfileDtos.cs`
- `backend/src/TicketStar.Application/DTOs/CollaboratorDtos.cs`

**Delete:**
- `backend/src/TicketStar.Application/Interfaces/IStaffService.cs`
- `backend/src/TicketStar.Application/Services/StaffService.cs`
- `backend/src/TicketStar.Application/DTOs/Staff/StaffDtos.cs`

## Implementation Steps

### 1. OrganizerProfile DTOs
```csharp
public record CreateOrganizerProfileRequest(
    string OrganizationName,
    string? Description,
    string? Phone,
    string? Address,
    string? Website,
    string? FacebookUrl,
    string? InstagramUrl);

public record UpdateOrganizerProfileRequest(
    string OrganizationName,
    string? Description,
    string? Phone,
    string? Address,
    string? Website,
    string? FacebookUrl,
    string? InstagramUrl);

public record OrganizerProfileResponse(
    string Id,
    string OrganizationName,
    string? Description,
    string? LogoUrl,
    string? Phone,
    string? Address,
    string? Website,
    string? FacebookUrl,
    string? InstagramUrl,
    bool IsComplete,
    DateTime CreatedAt);
```

### 2. Collaborator DTOs
```csharp
public record InviteCollaboratorRequest(string Email, string PermissionLevel);
public record GenerateInviteLinkRequest(string PermissionLevel);
public record UpdateCollaboratorRequest(string PermissionLevel);
public record AcceptInviteRequest(string Token);

public record CollaboratorResponse(
    string Id,
    string? UserId,
    string Email,
    string? FullName,
    string PermissionLevel,
    string Status,
    DateTime InvitedAt,
    DateTime? AcceptedAt);

public record InviteLinkResponse(string Token, string InviteUrl, DateTime ExpiresAt);
```

### 3. IOrganizerProfileService
- `GetByUserIdAsync(userId)` → OrganizerProfileResponse?
- `CreateAsync(userId, request)` → Result<OrganizerProfileResponse>
- `UpdateAsync(userId, request)` → Result<OrganizerProfileResponse>
- `UploadLogoAsync(userId, file)` → Result<string> (logo URL)

### 4. OrganizerProfileService
- Create: validate required fields → create profile → set User.IsOrganizer=true → return
- Update: verify ownership → update fields → return
- **Guard**: If user already has profile, reject create

### 5. ICollaboratorService
- `InviteByEmailAsync(organizerId, eventId, request)` → Result<CollaboratorResponse>
- `GenerateInviteLinkAsync(organizerId, eventId, request)` → Result<InviteLinkResponse>
- `AcceptInviteAsync(userId, token)` → Result<CollaboratorResponse>
- `DeclineInviteAsync(userId, token)` → Result
- `UpdatePermissionAsync(organizerId, eventId, collaboratorId, request)` → Result<CollaboratorResponse>
- `RemoveCollaboratorAsync(organizerId, eventId, collaboratorId)` → Result
- `GetEventCollaboratorsAsync(userId, eventId)` → Result<List<CollaboratorResponse>>
- `GetMyCollaborationsAsync(userId)` → Result<List<CollaborationEventResponse>>

### 6. CollaboratorService
- **InviteByEmail**: verify organizer owns event → check duplicate → create EventCollaborator (Pending) → send email → return
- **GenerateInviteLink**: verify organizer → create token → set ExpiresAt (72h) → return URL
- **AcceptInvite**: find by token → verify not expired → set UserId, AcceptedAt, Status=Accepted → return
- **Permission checks**: organizer of event OR admin can manage collaborators

### 7. Update EventService
- Before event creation: check `User.IsOrganizer == true` AND `OrganizerProfile.IsComplete == true`
- Return clear error if not: "Complete your organizer profile first"

### 8. Update CheckInService
- Replace `IStaffAssignmentRepository.IsAssignedAsync()` → `IEventCollaboratorRepository.GetPermissionLevelAsync()`
- Require PermissionLevel >= Operator for check-in operations

### 9. Update TokenService / AuthService
- JWT role claim: only "User" or "Admin"
- Keep `is_organizer` claim as-is
- Add `collaborator_events` claim? **No** — too dynamic, check DB instead

### 10. Update AdminService
- Remove `GrantOrganizerAsync` / `RevokeOrganizerAsync` (or keep RevokeOrganizer for admin override)
- Update `ListUsersAsync` DTO to not reference Staff/Organizer roles

## Todo

- [ ] Create OrganizerProfile DTOs
- [ ] Create Collaborator DTOs
- [ ] Create IOrganizerProfileService + implementation
- [ ] Create ICollaboratorService + implementation
- [ ] Update EventService (organizer profile check)
- [ ] Update CheckInService (collaborator permission check)
- [ ] Update AuthService/TokenService (JWT claims)
- [ ] Update AdminService (remove/adjust organizer methods)
- [ ] Delete IStaffService + StaffService + StaffDtos
- [ ] Verify all services compile

## Success Criteria

- No references to Staff role in application layer
- OrganizerProfile CRUD works with proper validation
- Collaborator invite (email + link) with permission levels
- Check-in authorization uses collaborator permissions
- JWT tokens only contain User/Admin roles
