using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.CheckIn;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Application.Services;

public class CheckInService : ICheckInService
{
    private readonly ITicketRepository _ticketRepo;
    private readonly ICheckInRepository _checkInRepo;
    private readonly IStaffAssignmentRepository _staffAssignmentRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CheckInService> _logger;

    public CheckInService(
        ITicketRepository ticketRepo,
        ICheckInRepository checkInRepo,
        IStaffAssignmentRepository staffAssignmentRepo,
        IUnitOfWork unitOfWork,
        ILogger<CheckInService> logger)
    {
        _ticketRepo = ticketRepo;
        _checkInRepo = checkInRepo;
        _staffAssignmentRepo = staffAssignmentRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<CheckInResponse>> ScanTicketAsync(string qrCode, string scannerId, Guid eventId, CancellationToken ct)
    {
        // Parse QR code
        var parts = qrCode.Split('|');
        if (parts.Length < 5)
            return Result<CheckInResponse>.Failure("Invalid QR code format");

        if (!Guid.TryParse(parts[0], out var ticketId))
            return Result<CheckInResponse>.Failure("Invalid ticket ID");

        // Verify ticket belongs to this event
        var ticket = await _ticketRepo.GetByQrCodeAsync(qrCode, ct);
        if (ticket == null)
            return Result<CheckInResponse>.Failure("Ticket not found", ResultError.NotFound);

        if (ticket.EventId != eventId)
            return Result<CheckInResponse>.Failure("Ticket does not belong to this event", ResultError.Forbidden);

        // Check if already checked in
        var existingCheckIn = await _checkInRepo.GetByTicketAsync(ticket.Id, ct);
        if (existingCheckIn != null)
        {
            return Result<CheckInResponse>.Success(new CheckInResponse(
                ticket.Id,
                "",
                "",
                true,
                existingCheckIn.ScannedAt,
                "" // Scanner name - would need join
            ));
        }

        // Create check-in record
        var checkIn = new CheckIn
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            ScannedBy = scannerId,
            ScannedAt = DateTime.UtcNow,
            EventId = eventId
        };

        try
        {
            _checkInRepo.Add(checkIn);
            await _ticketRepo.UpdateCheckedInAsync(ticket.Id, true, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            return Result<CheckInResponse>.Success(new CheckInResponse(
                ticket.Id,
                "",
                "",
                true,
                checkIn.ScannedAt,
                ""
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check in ticket");
            return Result<CheckInResponse>.Failure("Failed to check in ticket");
        }
    }

    public async Task<Result<List<CheckInResponse>>> GetEventCheckInsAsync(Guid eventId, CancellationToken ct)
    {
        var checkIns = await _checkInRepo.GetByEventAsync(eventId, ct);
        return Result<List<CheckInResponse>>.Success(checkIns.Select(ci => new CheckInResponse(
            ci.TicketId,
            "",
            "",
            true,
            ci.ScannedAt,
            ""
        )).ToList());
    }

    public async Task<Result<EventCheckInStatsResponse>> GetEventStatsAsync(Guid eventId, CancellationToken ct)
    {
        var totalTickets = await _ticketRepo.Query()
            .CountAsync(t => t.EventId == eventId, ct);

        var checkedInCount = await _checkInRepo.GetCheckInCountAsync(eventId, ct);

        return Result<EventCheckInStatsResponse>.Success(new EventCheckInStatsResponse(
            totalTickets,
            checkedInCount,
            totalTickets - checkedInCount
        ));
    }
}
