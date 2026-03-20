using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class CollaboratorService : ICollaboratorService
{
    private readonly IEventCollaboratorRepository _collabRepo;
    private readonly IEventRepository _eventRepo;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly SmtpOptions _smtpOpts;
    private readonly ILogger<CollaboratorService> _logger;

    public CollaboratorService(
        IEventCollaboratorRepository collabRepo,
        IEventRepository eventRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        IEmailService emailService,
        IOptions<SmtpOptions> smtpOpts,
        ILogger<CollaboratorService> logger)
    {
        _collabRepo = collabRepo;
        _eventRepo = eventRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _smtpOpts = smtpOpts.Value;
        _logger = logger;
    }

    public async Task<Result<CollaboratorResponse>> InviteByEmailAsync(
        string organizerId, Guid eventId, InviteCollaboratorRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<CollaboratorResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != organizerId)
            return Result<CollaboratorResponse>.Failure("Not authorized", ResultError.Forbidden);

        if (!Enum.TryParse<CollaboratorPermissionLevel>(request.PermissionLevel, true, out var permLevel))
            return Result<CollaboratorResponse>.Failure("Invalid permission level");

        var existing = await _collabRepo.GetByEmailAndEventAsync(request.Email, eventId, ct);
        if (existing != null)
            return Result<CollaboratorResponse>.Failure("User already invited to this event", ResultError.Conflict);

        var invitedUser = await _userRepo.GetByEmailAsync(request.Email, ct);

        var collaborator = new EventCollaborator
        {
            UserId = invitedUser?.Id,
            EventId = eventId,
            Email = request.Email,
            PermissionLevel = permLevel,
            InvitedBy = organizerId,
            InvitedAt = DateTime.UtcNow,
            Status = CollaboratorStatus.Pending,
            InviteToken = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddHours(72)
        };

        _collabRepo.Add(collaborator);
        await _unitOfWork.SaveChangesAsync(ct);

        // Send invite email (fire-and-forget — don't fail the invite if email bounces)
        var organizer = await _userRepo.GetByIdAsync(organizerId, ct);
        try
        {
            _ = _emailService.SendCollaboratorInviteAsync(
                request.Email,
                eventEntity.Title,
                organizer?.Email ?? "Organizer",
                collaborator.InviteToken,
                permLevel.ToString(),
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

        return Result<CollaboratorResponse>.Success(MapToResponse(collaborator, invitedUser));
    }

    public async Task<Result<InviteLinkResponse>> GenerateInviteLinkAsync(
        string organizerId, Guid eventId, GenerateInviteLinkRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<InviteLinkResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != organizerId)
            return Result<InviteLinkResponse>.Failure("Not authorized", ResultError.Forbidden);

        if (!Enum.TryParse<CollaboratorPermissionLevel>(request.PermissionLevel, true, out var permLevel))
            return Result<InviteLinkResponse>.Failure("Invalid permission level");

        var token = Guid.NewGuid().ToString("N");
        var expiresAt = DateTime.UtcNow.AddHours(72);

        // Create a placeholder collaborator for the link
        var collaborator = new EventCollaborator
        {
            EventId = eventId,
            Email = $"invite-link-{token[..8]}@placeholder",
            PermissionLevel = permLevel,
            InvitedBy = organizerId,
            InvitedAt = DateTime.UtcNow,
            Status = CollaboratorStatus.Pending,
            InviteToken = token,
            ExpiresAt = expiresAt
        };

        _collabRepo.Add(collaborator);
        await _unitOfWork.SaveChangesAsync(ct);

        var inviteLink = $"{_smtpOpts.AppBaseUrl}/invite/{token}";
        return Result<InviteLinkResponse>.Success(new InviteLinkResponse(token, inviteLink, expiresAt));
    }

    public async Task<Result<CollaboratorResponse>> AcceptInviteAsync(string userId, string token, CancellationToken ct)
    {
        var collaborator = await _collabRepo.GetByTokenAsync(token, ct);
        if (collaborator == null)
            return Result<CollaboratorResponse>.Failure("Invite not found", ResultError.NotFound);

        if (collaborator.Status != CollaboratorStatus.Pending)
            return Result<CollaboratorResponse>.Failure("Invite is no longer valid");

        if (collaborator.ExpiresAt.HasValue && collaborator.ExpiresAt < DateTime.UtcNow)
            return Result<CollaboratorResponse>.Failure("Invite has expired");

        var user = await _userRepo.GetByIdAsync(userId, ct);

        collaborator.UserId = userId;
        collaborator.Email = user?.Email ?? collaborator.Email;
        collaborator.AcceptedAt = DateTime.UtcNow;
        collaborator.Status = CollaboratorStatus.Accepted;
        collaborator.UpdatedAt = DateTime.UtcNow;

        _collabRepo.Update(collaborator);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result<CollaboratorResponse>.Success(MapToResponse(collaborator, user));
    }

    public async Task<Result<bool>> DeclineInviteAsync(string userId, string token, CancellationToken ct)
    {
        var collaborator = await _collabRepo.GetByTokenAsync(token, ct);
        if (collaborator == null)
            return Result<bool>.Failure("Invite not found", ResultError.NotFound);

        collaborator.Status = CollaboratorStatus.Declined;
        collaborator.UpdatedAt = DateTime.UtcNow;

        _collabRepo.Update(collaborator);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<CollaboratorResponse>> UpdatePermissionAsync(
        string organizerId, Guid eventId, string collaboratorId, UpdateCollaboratorRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<CollaboratorResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != organizerId)
            return Result<CollaboratorResponse>.Failure("Not authorized", ResultError.Forbidden);

        if (!Enum.TryParse<CollaboratorPermissionLevel>(request.PermissionLevel, true, out var permLevel))
            return Result<CollaboratorResponse>.Failure("Invalid permission level");

        var collaborator = await _collabRepo.GetByIdAsync(collaboratorId, ct);
        if (collaborator == null || collaborator.EventId != eventId)
            return Result<CollaboratorResponse>.Failure("Collaborator not found", ResultError.NotFound);

        collaborator.PermissionLevel = permLevel;
        collaborator.UpdatedAt = DateTime.UtcNow;

        _collabRepo.Update(collaborator);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result<CollaboratorResponse>.Success(MapToResponse(collaborator, null));
    }

    public async Task<Result<bool>> RemoveCollaboratorAsync(
        string organizerId, Guid eventId, string collaboratorId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<bool>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != organizerId)
            return Result<bool>.Failure("Not authorized", ResultError.Forbidden);

        var collaborator = await _collabRepo.GetByIdAsync(collaboratorId, ct);
        if (collaborator == null || collaborator.EventId != eventId)
            return Result<bool>.Failure("Collaborator not found", ResultError.NotFound);

        _collabRepo.Remove(collaborator);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<List<CollaboratorResponse>>> GetEventCollaboratorsAsync(
        string userId, Guid eventId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<List<CollaboratorResponse>>.Failure("Event not found", ResultError.NotFound);

        // Organizer or accepted collaborator can view
        if (eventEntity.OrganizerId != userId && !await _collabRepo.IsCollaboratorAsync(userId, eventId, ct))
            return Result<List<CollaboratorResponse>>.Failure("Not authorized", ResultError.Forbidden);

        var collaborators = await _collabRepo.GetByEventAsync(eventId, ct);
        var responses = collaborators.Select(c => MapToResponse(c, c.User)).ToList();
        return Result<List<CollaboratorResponse>>.Success(responses);
    }

    public async Task<Result<List<CollaborationEventResponse>>> GetMyCollaborationsAsync(string userId, CancellationToken ct)
    {
        // Use GetActiveByUserAsync to include both Pending and Accepted (Pending needed for NotificationBell)
        var collaborations = await _collabRepo.GetActiveByUserAsync(userId, ct);
        var responses = collaborations.Select(c => new CollaborationEventResponse(
            c.Event.Id, c.Event.Title, c.Event.Venue,
            c.Event.StartAt, c.Event.EndAt, c.Event.Status.ToString(),
            c.PermissionLevel.ToString(), c.Status.ToString(),
            c.Status == CollaboratorStatus.Pending ? c.InviteToken : null,  // only expose token for pending
            c.Event.ImageUrl
        )).ToList();
        return Result<List<CollaborationEventResponse>>.Success(responses);
    }

    public async Task BackfillUserIdAsync(string userId, string email, CancellationToken ct)
    {
        var pending = await _collabRepo.GetPendingByEmailAsync(email, ct);
        if (pending.Count == 0) return;

        foreach (var c in pending)
        {
            c.UserId = userId;
            _collabRepo.Update(c);
        }
        await _unitOfWork.SaveChangesAsync(ct);
        _logger.LogInformation("Backfilled {Count} pending collaborator invite(s) for new user {UserId}", pending.Count, userId);
    }

    public async Task<Result<List<OrganizerProfileResponse>>> GetMyCollaboratorOrgsAsync(string userId, CancellationToken ct)
    {
        // Only accepted collaborations show org profiles (Pending invites don't grant org access yet)
        var collaborations = await _collabRepo.GetByUserAsync(userId, ct);

        // Collect distinct organizer profiles (one per organizer user, taking their first/primary profile)
        var seen = new HashSet<string>();
        var orgs = new List<OrganizerProfileResponse>();
        foreach (var c in collaborations)
        {
            var organizer = c.Event.Organizer;
            if (organizer == null || seen.Contains(organizer.Id)) continue;
            seen.Add(organizer.Id);
            var profile = organizer.OrganizerProfiles.OrderBy(p => p.CreatedAt).FirstOrDefault();
            if (profile == null) continue;
            orgs.Add(new OrganizerProfileResponse(
                profile.Id, profile.UserId, profile.OrganizationName,
                profile.Description, profile.LogoUrl, profile.Phone,
                profile.Address, profile.Website, profile.FacebookUrl,
                profile.InstagramUrl, profile.IsComplete, profile.CreatedAt));
        }
        return Result<List<OrganizerProfileResponse>>.Success(orgs);
    }

    private static CollaboratorResponse MapToResponse(EventCollaborator c, User? user) => new(
        c.Id, c.UserId, c.Email,
        user?.Profile?.FullName,
        c.PermissionLevel.ToString(),
        c.Status.ToString(),
        c.InvitedAt, c.AcceptedAt);
}
