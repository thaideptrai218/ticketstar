# Phase 2: Backend Infrastructure & Migration

## Overview
- **Priority:** P0
- **Status:** pending
- **Description:** Update EF Core configs, DbContext, repositories, create migration

## Related Files

**Modify:**
- `backend/src/TicketStar.Infrastructure/Data/AppDbContext.cs` — Replace StaffAssignments DbSet → EventCollaborators + OrganizerProfiles
- `backend/src/TicketStar.Infrastructure/Data/Configurations/UserConfiguration.cs` — Update Role conversion, add OrganizerProfile nav
- `backend/src/TicketStar.Infrastructure/Data/Configurations/EventConfiguration.cs` — Replace StaffAssignment nav → EventCollaborator

**Create:**
- `backend/src/TicketStar.Infrastructure/Data/Configurations/OrganizerProfileConfiguration.cs`
- `backend/src/TicketStar.Infrastructure/Data/Configurations/EventCollaboratorConfiguration.cs`
- `backend/src/TicketStar.Infrastructure/Repositories/OrganizerProfileRepository.cs`
- `backend/src/TicketStar.Infrastructure/Repositories/EventCollaboratorRepository.cs`
- EF Migration: `RoleConsolidationAndCollaborators`

**Delete:**
- `backend/src/TicketStar.Infrastructure/Data/Configurations/StaffAssignmentConfiguration.cs`
- `backend/src/TicketStar.Infrastructure/Repositories/StaffAssignmentRepository.cs`

## Implementation Steps

### 1. OrganizerProfileConfiguration
```csharp
builder.ToTable("OrganizerProfiles");
builder.HasKey(x => x.Id);
builder.Property(x => x.OrganizationName).IsRequired().HasMaxLength(200);
builder.Property(x => x.Description).HasMaxLength(1000);
builder.Property(x => x.Phone).HasMaxLength(20);
builder.Property(x => x.Address).HasMaxLength(500);
builder.Property(x => x.Website).HasMaxLength(200);
builder.Property(x => x.FacebookUrl).HasMaxLength(200);
builder.Property(x => x.InstagramUrl).HasMaxLength(200);
builder.HasIndex(x => x.UserId).IsUnique();
builder.HasOne(x => x.User).WithOne(u => u.OrganizerProfile).HasForeignKey<OrganizerProfile>(x => x.UserId);
```

### 2. EventCollaboratorConfiguration
```csharp
builder.ToTable("EventCollaborators");
builder.HasKey(x => x.Id);
builder.Property(x => x.Email).IsRequired().HasMaxLength(256);
builder.Property(x => x.PermissionLevel).HasConversion<string>().HasMaxLength(20);
builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
builder.Property(x => x.InviteToken).HasMaxLength(128);
builder.HasIndex(x => new { x.UserId, x.EventId }).IsUnique().HasFilter("\"UserId\" IS NOT NULL");
builder.HasIndex(x => new { x.Email, x.EventId }).IsUnique();
builder.HasIndex(x => x.InviteToken).IsUnique().HasFilter("\"InviteToken\" IS NOT NULL");
builder.HasIndex(x => x.EventId);
builder.HasOne(x => x.Event).WithMany(e => e.Collaborators).HasForeignKey(x => x.EventId).OnDelete(DeleteBehavior.Cascade);
builder.HasOne(x => x.User).WithMany(u => u.Collaborations).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
builder.HasOne(x => x.Inviter).WithMany().HasForeignKey(x => x.InvitedBy).OnDelete(DeleteBehavior.Restrict);
```

### 3. Update AppDbContext
- Add `DbSet<OrganizerProfile> OrganizerProfiles`
- Add `DbSet<EventCollaborator> EventCollaborators`
- Remove `DbSet<StaffAssignment> StaffAssignments`

### 4. Update UserConfiguration
- Role string conversion must handle new enum values (User, Admin only)

### 5. Update EventConfiguration
- Replace StaffAssignment nav with EventCollaborator

### 6. Implement Repositories
Both follow existing patterns (constructor injection of AppDbContext, async EF Core queries).

### 7. Create Migration

**Critical data migration steps in migration Up():**
1. Create OrganizerProfiles table
2. Create EventCollaborators table
3. Migrate existing StaffAssignment rows → EventCollaborators (PermissionLevel=Operator, Status=Accepted)
4. Create OrganizerProfile for users with IsOrganizer=true (IsComplete=false)
5. Convert UserRole values: Admin from 3→"Admin", User stays "User", Staff→"User", Organizer→"User"
6. Drop StaffAssignments table

```sql
-- Step: Convert existing staff assignments to collaborators
INSERT INTO EventCollaborators (Id, UserId, EventId, Email, PermissionLevel, InvitedBy, InvitedAt, AcceptedAt, Status)
SELECT sa.Id, sa.UserId, sa.EventId, u.Email, 'Operator', sa.AssignedBy, sa.AssignedAt, sa.AssignedAt, 'Accepted'
FROM StaffAssignments sa JOIN Users u ON sa.UserId = u.Id;

-- Step: Convert role values
UPDATE Users SET Role = 'User' WHERE Role IN ('Staff', 'Organizer');
UPDATE Users SET Role = 'Admin' WHERE Role = 'Admin';
```

### 8. Register in DI
Update `ServiceCollectionExtensions.cs` to register new repositories and remove old ones.

## Todo

- [ ] Create OrganizerProfileConfiguration
- [ ] Create EventCollaboratorConfiguration
- [ ] Update UserConfiguration (role conversion)
- [ ] Update EventConfiguration (nav property)
- [ ] Update AppDbContext (DbSets)
- [ ] Implement OrganizerProfileRepository
- [ ] Implement EventCollaboratorRepository
- [ ] Delete StaffAssignmentConfiguration
- [ ] Delete StaffAssignmentRepository
- [ ] Update DI registration
- [ ] Create & test migration
- [ ] Verify migration Up/Down works

## Success Criteria

- Migration applies cleanly on existing database
- Existing staff assignments preserved as EventCollaborator (Operator level)
- Existing organizers get OrganizerProfile records
- Role values correctly converted in database
- All repositories compile and DI resolves
