using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;
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
    private readonly ILogger<CollaboratorService> _logger;

    public CollaboratorService(
        IEventCollaboratorRepository collabRepo,
        IEventRepository eventRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        ILogger<CollaboratorService> logger)
    {
        _collabRepo = collabRepo;
        _eventRepo = eventRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
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

        var inviteUrl = $"/invite/{token}";
        return Result<InviteLinkResponse>.Success(new InviteLinkResponse(token, inviteUrl, expiresAt));
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
        var collaborations = await _collabRepo.GetByUserAsync(userId, ct);
        var responses = collaborations.Select(c => new CollaborationEventResponse(
            c.Event.Id, c.Event.Title, c.Event.Venue,
            c.Event.StartAt, c.Event.EndAt, c.Event.Status.ToString(),
            c.PermissionLevel.ToString()
        )).ToList();
        return Result<List<CollaborationEventResponse>>.Success(responses);
    }

    private static CollaboratorResponse MapToResponse(EventCollaborator c, User? user) => new(
        c.Id, c.UserId, c.Email,
        user?.Profile?.FullName,
        c.PermissionLevel.ToString(),
        c.Status.ToString(),
        c.InvitedAt, c.AcceptedAt);
}
