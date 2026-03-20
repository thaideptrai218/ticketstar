using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Tickets;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class TicketService : ITicketService
{
    private readonly ITicketRepository _ticketRepo;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IQrCodeService _qrCodeService;
    private readonly ILogger<TicketService> _logger;

    public TicketService(
        ITicketRepository ticketRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        IQrCodeService qrCodeService,
        ILogger<TicketService> logger)
    {
        _ticketRepo = ticketRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _qrCodeService = qrCodeService;
        _logger = logger;
    }

    public async Task<Result<List<MyTicketResponse>>> GetMyTicketsAsync(string userId, CancellationToken ct)
    {
        var tickets = await _ticketRepo.Query()
            .Include(t => t.Event)
            .Include(t => t.TicketType)
            .Include(t => t.OrderItem)
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        var responses = tickets.Select(t => new MyTicketResponse(
            t.Id,
            t.OrderItem.OrderId,
            t.EventId,
            t.Event.Title,
            t.Event.Venue,
            t.Event.StartAt,
            t.TicketType.Name,
            t.IsCheckedIn,
            t.CreatedAt
        )).ToList();

        return Result<List<MyTicketResponse>>.Success(responses);
    }

    public async Task<Result<TicketQrResponse>> GetTicketQrAsync(Guid ticketId, string userId, CancellationToken ct)
    {
        var ticket = await _ticketRepo.Query()
            .Where(t => t.Id == ticketId)
            .Select(t => new { t.UserId, t.QrCode })
            .FirstOrDefaultAsync(ct);

        if (ticket == null)
            return Result<TicketQrResponse>.Failure("Ticket not found", ResultError.NotFound);

        if (ticket.UserId != userId)
            return Result<TicketQrResponse>.Failure("Not authorized", ResultError.Forbidden);

        return Result<TicketQrResponse>.Success(new TicketQrResponse(
            _qrCodeService.GenerateQrCodeBase64(ticket.QrCode)
        ));
    }

    public async Task<Result<TicketDetailResponse>> GetTicketByIdAsync(Guid ticketId, string userId, CancellationToken ct)
    {
        var ticket = await _ticketRepo.Query()
            .Include(t => t.Event)
            .Include(t => t.TicketType)
            .Include(t => t.CheckIn)
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
            return Result<TicketDetailResponse>.Failure("Ticket not found", ResultError.NotFound);

        if (ticket.UserId != userId)
            return Result<TicketDetailResponse>.Failure("Not authorized", ResultError.Forbidden);

        return Result<TicketDetailResponse>.Success(new TicketDetailResponse(
            ticket.Id,
            ticket.EventId,
            ticket.Event.Title,
            ticket.Event.Venue,
            ticket.Event.StartAt,
            ticket.Event.EndAt,
            ticket.TicketType.Name,
            ticket.TicketType.Price,
            _qrCodeService.GenerateQrCodeBase64(ticket.QrCode),
            ticket.IsCheckedIn,
            ticket.CheckIn?.ScannedAt,
            ticket.CreatedAt
        ));
    }

    public async Task<Result<TicketDetailResponse>> TransferTicketAsync(Guid ticketId, string userId, TransferTicketRequest request, CancellationToken ct)
    {
        var ticket = await _ticketRepo.Query()
            .Include(t => t.Event)
            .Include(t => t.TicketType)
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
            return Result<TicketDetailResponse>.Failure("Ticket not found", ResultError.NotFound);

        if (ticket.UserId != userId)
            return Result<TicketDetailResponse>.Failure("Not authorized", ResultError.Forbidden);

        if (ticket.IsCheckedIn)
            return Result<TicketDetailResponse>.Failure("Cannot transfer a checked-in ticket", ResultError.Conflict);

        var recipient = await _userRepo.GetByEmailAsync(request.RecipientEmail, ct);
        if (recipient == null)
            return Result<TicketDetailResponse>.Failure("Recipient not found", ResultError.NotFound);

        if (recipient.Id == userId)
            return Result<TicketDetailResponse>.Failure("Cannot transfer to yourself");

        // Update ownership and regenerate QR
        ticket.UserId = recipient.Id;
        var qrPayload = _qrCodeService.GenerateTicketPayload(ticket.Id, ticket.EventId, Guid.Parse(recipient.Id));
        var qrSignature = _qrCodeService.GenerateHmac(qrPayload);
        ticket.QrCode = $"{qrPayload}|{qrSignature}";

        try
        {
            _ticketRepo.Update(ticket);
            await _unitOfWork.SaveChangesAsync(ct);

            return Result<TicketDetailResponse>.Success(new TicketDetailResponse(
                ticket.Id,
                ticket.EventId,
                ticket.Event.Title,
                ticket.Event.Venue,
                ticket.Event.StartAt,
                ticket.Event.EndAt,
                ticket.TicketType.Name,
                ticket.TicketType.Price,
                _qrCodeService.GenerateQrCodeBase64(ticket.QrCode),
                ticket.IsCheckedIn,
                null,
                ticket.CreatedAt
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to transfer ticket {TicketId}", ticketId);
            return Result<TicketDetailResponse>.Failure("Failed to transfer ticket");
        }
    }
}
