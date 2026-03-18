---
phase: 1
status: pending
priority: high
---

# Phase 1: Backend — DTO Expansion + Registration Backfill

## Overview
Add `inviteToken` to `CollaborationEventResponse` so frontend can accept/decline inline. Add backfill logic on registration to link pre-existing invites.

## Related Code Files

### Modify
- `backend/src/TicketStar.Application/DTOs/CollaboratorDtos.cs`
- `backend/src/TicketStar.Application/Services/CollaboratorService.cs`
- `backend/src/TicketStar.API/Controllers/AccountController.cs` (registration backfill)

## Implementation Steps

### 1. Add inviteToken to CollaborationEventResponse
**File:** `CollaboratorDtos.cs`

Add `string? InviteToken` parameter to `CollaborationEventResponse` record.

```csharp
public record CollaborationEventResponse(
    Guid EventId, string Title, string? Venue,
    DateTime StartAt, DateTime EndAt, string Status,
    string PermissionLevel, string CollaboratorStatus,
    string? InviteToken);  // NEW
```

### 2. Pass InviteToken in GetMyCollaborationsAsync
**File:** `CollaboratorService.cs` → `GetMyCollaborationsAsync`

Update the mapping to include `c.InviteToken`:

```csharp
var responses = collaborations.Select(c => new CollaborationEventResponse(
    c.Event.Id, c.Event.Title, c.Event.Venue,
    c.Event.StartAt, c.Event.EndAt, c.Event.Status.ToString(),
    c.PermissionLevel.ToString(), c.Status.ToString(),
    c.InviteToken  // NEW — only non-null for Pending
)).ToList();
```

### 3. Backfill UserId on Registration
**File:** `AccountController.cs` or the registration service

After successful user registration, query `EventCollaborator` by email where `UserId == null`, set `UserId` to the new user's ID.

Add to `IEventCollaboratorRepository`:
```csharp
Task<List<EventCollaborator>> GetPendingByEmailAsync(string email, CancellationToken ct);
```

Add to `CollaboratorService` or a dedicated method:
```csharp
public async Task BackfillUserIdAsync(string userId, string email, CancellationToken ct)
{
    var pending = await _collabRepo.GetPendingByEmailAsync(email, ct);
    foreach (var c in pending)
    {
        c.UserId = userId;
        _collabRepo.Update(c);
    }
    if (pending.Count > 0) await _unitOfWork.SaveChangesAsync(ct);
}
```

Call after registration succeeds.

## Todo List
- [ ] Add `InviteToken` to `CollaborationEventResponse`
- [ ] Update `GetMyCollaborationsAsync` mapping
- [ ] Add `GetPendingByEmailAsync` to repo interface + implementation
- [ ] Add `BackfillUserIdAsync` to `ICollaboratorService` + implementation
- [ ] Call backfill after user registration
- [ ] Verify compile

## Success Criteria
- `GET /api/collaborators/my` returns `inviteToken` for pending invites
- New user registration backfills UserId on existing invites
