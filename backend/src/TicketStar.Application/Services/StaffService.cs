using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Staff;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class StaffService : IStaffService
{
    private readonly IStaffAssignmentRepository _staffRepo;
    private readonly IEventRepository _eventRepo;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<StaffService> _logger;

    public StaffService(
        IStaffAssignmentRepository staffRepo,
        IEventRepository eventRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        ILogger<StaffService> logger)
    {
        _staffRepo = staffRepo;
        _eventRepo = eventRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<StaffAssignmentResponse>> AssignStaffAsync(string organizerId, Guid eventId, AssignStaffRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<StaffAssignmentResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != organizerId)
            return Result<StaffAssignmentResponse>.Failure("Not authorized", ResultError.Forbidden);

        var staffUser = await _userRepo.GetByEmailAsync(request.Email, ct);
        if (staffUser == null)
            return Result<StaffAssignmentResponse>.Failure("User not found", ResultError.NotFound);

        if (await _staffRepo.IsAssignedAsync(staffUser.Id, eventId, ct))
            return Result<StaffAssignmentResponse>.Failure("User already assigned to this event", ResultError.Conflict);

        var assignment = new StaffAssignment
        {
            Id = Guid.NewGuid(),
            UserId = staffUser.Id,
            EventId = eventId,
            AssignedBy = organizerId,
            AssignedAt = DateTime.UtcNow
        };

        try
        {
            _staffRepo.Add(assignment);
            await _unitOfWork.SaveChangesAsync(ct);

            return Result<StaffAssignmentResponse>.Success(new StaffAssignmentResponse(
                assignment.Id,
                staffUser.Id,
                staffUser.Email,
                staffUser.Profile?.FullName,
                assignment.AssignedAt
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to assign staff");
            return Result<StaffAssignmentResponse>.Failure("Failed to assign staff");
        }
    }

    public async Task<Result<bool>> RemoveStaffAsync(string organizerId, Guid eventId, string staffUserId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<bool>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != organizerId)
            return Result<bool>.Failure("Not authorized", ResultError.Forbidden);

        var assignment = await _staffRepo.FirstOrDefaultAsync(
            a => a.EventId == eventId && a.UserId == staffUserId, ct);

        if (assignment == null)
            return Result<bool>.Failure("Staff assignment not found", ResultError.NotFound);

        try
        {
            _staffRepo.Remove(assignment);
            await _unitOfWork.SaveChangesAsync(ct);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove staff");
            return Result<bool>.Failure("Failed to remove staff");
        }
    }

    public async Task<Result<List<StaffAssignmentResponse>>> GetEventStaffAsync(string userId, Guid eventId, CancellationToken ct)
    {
        // Only organizer or assigned staff can view
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<List<StaffAssignmentResponse>>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != userId && !await _staffRepo.IsAssignedAsync(userId, eventId, ct))
            return Result<List<StaffAssignmentResponse>>.Failure("Not authorized", ResultError.Forbidden);

        var assignments = await _staffRepo.Query()
            .Include(a => a.User)
            .ThenInclude(u => u.Profile)
            .Where(a => a.EventId == eventId)
            .ToListAsync(ct);

        var responses = assignments.Select(a => new StaffAssignmentResponse(
            a.Id,
            a.UserId,
            a.User.Email,
            a.User.Profile?.FullName,
            a.AssignedAt
        )).ToList();

        return Result<List<StaffAssignmentResponse>>.Success(responses);
    }
}
