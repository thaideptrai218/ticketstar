# Phase 1: Backend Domain Changes

## Overview
- **Priority:** P0
- **Status:** pending
- **Description:** Modify domain entities, enums, and interfaces for new role model

## Related Files

**Modify:**
- `backend/src/TicketStar.Domain/Enums/UserRole.cs` — Remove Staff, Organizer; keep User=0, Admin=1
- `backend/src/TicketStar.Domain/Entities/User.cs` — Add OrganizerProfile nav, remove StaffAssignments nav
- `backend/src/TicketStar.Domain/Entities/Event.cs` — Replace StaffAssignments → EventCollaborators nav

**Create:**
- `backend/src/TicketStar.Domain/Entities/OrganizerProfile.cs`
- `backend/src/TicketStar.Domain/Entities/EventCollaborator.cs`
- `backend/src/TicketStar.Domain/Enums/CollaboratorPermissionLevel.cs`
- `backend/src/TicketStar.Domain/Enums/CollaboratorStatus.cs`
- `backend/src/TicketStar.Domain/Interfaces/IOrganizerProfileRepository.cs`
- `backend/src/TicketStar.Domain/Interfaces/IEventCollaboratorRepository.cs`

**Delete:**
- `backend/src/TicketStar.Domain/Entities/StaffAssignment.cs`
- `backend/src/TicketStar.Domain/Interfaces/IStaffAssignmentRepository.cs`

## Implementation Steps

### 1. Update UserRole Enum
```csharp
public enum UserRole
{
    User = 0,
    Admin = 1
}
```
**Note:** Admin changes from 3→1. Migration must handle data conversion.

### 2. Create CollaboratorPermissionLevel Enum
```csharp
public enum CollaboratorPermissionLevel
{
    Viewer = 0,
    Operator = 1,
    Manager = 2
}
```

### 3. Create CollaboratorStatus Enum
```csharp
public enum CollaboratorStatus
{
    Pending = 0,
    Accepted = 1,
    Declined = 2,
    Revoked = 3
}
```

### 4. Create OrganizerProfile Entity
```csharp
public class OrganizerProfile
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = null!;
    public string OrganizationName { get; set; } = null!;
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Website { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public bool IsComplete { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
```

### 5. Create EventCollaborator Entity
```csharp
public class EventCollaborator
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? UserId { get; set; }
    public string EventId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public CollaboratorPermissionLevel PermissionLevel { get; set; }
    public string? InviteToken { get; set; }
    public string InvitedBy { get; set; } = null!;
    public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public CollaboratorStatus Status { get; set; } = CollaboratorStatus.Pending;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public Event Event { get; set; } = null!;
    public User Inviter { get; set; } = null!;
}
```

### 6. Update User Entity
- Remove `StaffAssignments` nav property
- Add `OrganizerProfile` nav property (1:1)
- Add `Collaborations` nav property (1:many EventCollaborator)
- Keep `IsOrganizer` flag

### 7. Update Event Entity
- Remove `StaffAssignments` nav property
- Add `Collaborators` nav property (ICollection<EventCollaborator>)

### 8. Create Repository Interfaces
**IOrganizerProfileRepository:**
- `GetByUserIdAsync(userId)`
- `CreateAsync(profile)`
- `UpdateAsync(profile)`

**IEventCollaboratorRepository:**
- `GetByEventAsync(eventId)`
- `GetByUserAsync(userId)`
- `GetByTokenAsync(inviteToken)`
- `GetByEmailAndEventAsync(email, eventId)`
- `IsCollaboratorAsync(userId, eventId)`
- `GetPermissionLevelAsync(userId, eventId)`
- `CreateAsync(collaborator)`
- `UpdateAsync(collaborator)`
- `DeleteAsync(id)`

### 9. Delete Old Files
- Remove `StaffAssignment.cs` entity
- Remove `IStaffAssignmentRepository.cs` interface

## Todo

- [ ] Update UserRole enum (User=0, Admin=1)
- [ ] Create CollaboratorPermissionLevel enum
- [ ] Create CollaboratorStatus enum
- [ ] Create OrganizerProfile entity
- [ ] Create EventCollaborator entity
- [ ] Update User entity (nav properties)
- [ ] Update Event entity (nav properties)
- [ ] Create IOrganizerProfileRepository
- [ ] Create IEventCollaboratorRepository
- [ ] Delete StaffAssignment entity
- [ ] Delete IStaffAssignmentRepository
- [ ] Verify solution compiles

## Success Criteria

- Domain layer compiles with zero Staff/Organizer role references
- New entities follow existing patterns (GUID IDs, DateTime timestamps)
- Interfaces define all needed repository operations
