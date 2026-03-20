using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class OrganizerCollaboratorService : IOrganizerCollaboratorService
{
    private readonly IOrganizerCollaboratorRepository _collabRepo;
    private readonly IOrganizerProfileRepository _profileRepo;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly ILogger<OrganizerCollaboratorService> _logger;

    public OrganizerCollaboratorService(
        IOrganizerCollaboratorRepository collabRepo,
        IOrganizerProfileRepository profileRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        IEmailService emailService,
        ILogger<OrganizerCollaboratorService> logger)
    {
        _collabRepo = collabRepo;
        _profileRepo = profileRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<Result<OrgCollaboratorResponse>> InviteByEmailAsync(
        string ownerId, string profileId, InviteOrgCollaboratorRequest request, CancellationToken ct)
    {
        var profile = await _profileRepo.GetByIdAsync(profileId, ct);
        if (profile == null) return Result<OrgCollaboratorResponse>.Failure("Organization not found", ResultError.NotFound);
        if (profile.UserId != ownerId) return Result<OrgCollaboratorResponse>.Failure("Not authorized", ResultError.Forbidden);

        if (!Enum.TryParse<CollaboratorPermissionLevel>(request.PermissionLevel, true, out var permLevel))
            return Result<OrgCollaboratorResponse>.Failure("Invalid permission level");

        var existing = await _collabRepo.GetByEmailAndProfileAsync(request.Email, profileId, ct);
        if (existing != null)
            return Result<OrgCollaboratorResponse>.Failure("User already invited to this organization", ResultError.Conflict);

        var invitedUser = await _userRepo.GetByEmailAsync(request.Email, ct);

        // Also check by userId to prevent unique index violation when same user has multiple emails
        if (invitedUser != null)
        {
            var existingByUser = await _collabRepo.FirstOrDefaultAsync(
                x => x.UserId == invitedUser.Id && x.OrganizerProfileId == profileId, ct);
            if (existingByUser != null)
                return Result<OrgCollaboratorResponse>.Failure("User already invited to this organization", ResultError.Conflict);
        }

        var collaborator = new OrganizerCollaborator
        {
            UserId = invitedUser?.Id,
            OrganizerProfileId = profileId,
            Email = request.Email,
            PermissionLevel = permLevel,
            InvitedBy = ownerId,
            Status = CollaboratorStatus.Pending,
            InviteToken = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddHours(72)
        };

        _collabRepo.Add(collaborator);
        try
        {
            await _unitOfWork.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("Duplicate") == true
                                           || ex.InnerException?.Message.Contains("duplicate") == true
                                           || ex.InnerException?.Message.Contains("UNIQUE") == true)
        {
            _logger.LogWarning(ex, "Duplicate collaborator invite attempt for {Email} on profile {ProfileId}", request.Email, profileId);
            return Result<OrgCollaboratorResponse>.Failure("User already invited to this organization", ResultError.Conflict);
        }

        // Fire-and-forget invite email — log errors so failures are visible
        var inviter = await _userRepo.GetByIdAsync(ownerId, ct);
        try
        {
            _ = _emailService.SendCollaboratorInviteAsync(
                request.Email,
                profile.OrganizationName,
                inviter?.Email ?? ownerId,
                collaborator.InviteToken!,
                request.PermissionLevel,
                CancellationToken.None).ContinueWith(t =>
            {
                if (t.IsFaulted)
                    _logger.LogError(t.Exception, "Failed to send collaborator invite email to {Email}", request.Email);
            }, TaskScheduler.Default);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initiate collaborator invite email to {Email}", request.Email);
        }

        return Result<OrgCollaboratorResponse>.Success(MapToResponse(collaborator, null));
    }

    public async Task<Result<List<OrgCollaboratorResponse>>> GetCollaboratorsAsync(
        string ownerId, string profileId, CancellationToken ct)
    {
        var profile = await _profileRepo.GetByIdAsync(profileId, ct);
        if (profile == null) return Result<List<OrgCollaboratorResponse>>.Failure("Organization not found", ResultError.NotFound);
        if (profile.UserId != ownerId) return Result<List<OrgCollaboratorResponse>>.Failure("Not authorized", ResultError.Forbidden);

        var collabs = await _collabRepo.GetByOrganizerProfileAsync(profileId, ct);
        return Result<List<OrgCollaboratorResponse>>.Success(
            collabs.Select(c => MapToResponse(c, c.User?.Profile?.FullName)).ToList());
    }

    public async Task<Result<OrgCollaboratorResponse>> UpdatePermissionAsync(
        string ownerId, string profileId, string collaboratorId, UpdateOrgCollaboratorRequest request, CancellationToken ct)
    {
        var profile = await _profileRepo.GetByIdAsync(profileId, ct);
        if (profile == null) return Result<OrgCollaboratorResponse>.Failure("Organization not found", ResultError.NotFound);
        if (profile.UserId != ownerId) return Result<OrgCollaboratorResponse>.Failure("Not authorized", ResultError.Forbidden);

        var collab = await _collabRepo.GetByIdAsync(collaboratorId, ct);
        if (collab == null || collab.OrganizerProfileId != profileId)
            return Result<OrgCollaboratorResponse>.Failure("Collaborator not found", ResultError.NotFound);

        if (!Enum.TryParse<CollaboratorPermissionLevel>(request.PermissionLevel, true, out var permLevel))
            return Result<OrgCollaboratorResponse>.Failure("Invalid permission level");

        collab.PermissionLevel = permLevel;
        collab.UpdatedAt = DateTime.UtcNow;
        _collabRepo.Update(collab);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result<OrgCollaboratorResponse>.Success(MapToResponse(collab, null));
    }

    public async Task<Result<bool>> RemoveCollaboratorAsync(
        string ownerId, string profileId, string collaboratorId, CancellationToken ct)
    {
        var profile = await _profileRepo.GetByIdAsync(profileId, ct);
        if (profile == null) return Result<bool>.Failure("Organization not found", ResultError.NotFound);
        if (profile.UserId != ownerId) return Result<bool>.Failure("Not authorized", ResultError.Forbidden);

        var collab = await _collabRepo.GetByIdAsync(collaboratorId, ct);
        if (collab == null || collab.OrganizerProfileId != profileId)
            return Result<bool>.Failure("Collaborator not found", ResultError.NotFound);

        _collabRepo.Remove(collab);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<OrgCollaboratorResponse>> AcceptInviteAsync(string userId, string token, CancellationToken ct)
    {
        var collab = await _collabRepo.GetByTokenAsync(token, ct);
        if (collab == null) return Result<OrgCollaboratorResponse>.Failure("Invalid or expired invite", ResultError.NotFound);
        if (collab.ExpiresAt.HasValue && collab.ExpiresAt < DateTime.UtcNow)
            return Result<OrgCollaboratorResponse>.Failure("Invite link has expired");
        if (collab.Status != CollaboratorStatus.Pending)
            return Result<OrgCollaboratorResponse>.Failure("Invite already processed");

        collab.UserId = userId;
        collab.Status = CollaboratorStatus.Accepted;
        collab.AcceptedAt = DateTime.UtcNow;
        collab.InviteToken = null;
        _collabRepo.Update(collab);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result<OrgCollaboratorResponse>.Success(MapToResponse(collab, null));
    }

    public async Task<Result<bool>> DeclineInviteAsync(string userId, string token, CancellationToken ct)
    {
        var collab = await _collabRepo.GetByTokenAsync(token, ct);
        if (collab == null) return Result<bool>.Failure("Invalid invite", ResultError.NotFound);

        collab.Status = CollaboratorStatus.Declined;
        collab.InviteToken = null;
        _collabRepo.Update(collab);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<List<OrgCollaboratorResponse>>> GetMyOrgInvitesAsync(string userId, CancellationToken ct)
    {
        var collabs = await _collabRepo.GetActiveByUserAsync(userId, ct);
        return Result<List<OrgCollaboratorResponse>>.Success(
            collabs.Select(c => MapToResponseWithToken(c)).ToList());
    }

    public async Task BackfillUserIdAsync(string userId, string email, CancellationToken ct)
    {
        var pending = await _collabRepo.GetPendingByEmailAsync(email, ct);
        foreach (var c in pending) c.UserId = userId;
        if (pending.Count > 0) await _unitOfWork.SaveChangesAsync(ct);
    }

    private static OrgCollaboratorResponse MapToResponse(OrganizerCollaborator c, string? fullName) => new(
        c.Id, c.UserId, c.Email, fullName,
        c.PermissionLevel.ToString(), c.Status.ToString(),
        c.InvitedAt, c.AcceptedAt);

    // Includes invite token and org info — used only for the invited user's own invite list
    private static OrgCollaboratorResponse MapToResponseWithToken(OrganizerCollaborator c) => new(
        c.Id, c.UserId, c.Email, null,
        c.PermissionLevel.ToString(), c.Status.ToString(),
        c.InvitedAt, c.AcceptedAt,
        InviteToken: c.Status == CollaboratorStatus.Pending ? c.InviteToken : null,
        OrganizerProfileId: c.OrganizerProfileId,
        OrganizationName: c.OrganizerProfile?.OrganizationName);
}
