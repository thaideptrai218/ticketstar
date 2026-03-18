using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Events;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class TicketTypeService : ITicketTypeService
{
    private readonly IEventRepository _eventRepo;
    private readonly ITicketTypeRepository _ticketTypeRepo;
    private readonly IUnitOfWork _unitOfWork;

    public TicketTypeService(IEventRepository eventRepo, ITicketTypeRepository ticketTypeRepo, IUnitOfWork unitOfWork)
    {
        _eventRepo = eventRepo;
        _ticketTypeRepo = ticketTypeRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<List<TicketTypeResponse>>> ListByEventAsync(Guid eventId, CancellationToken ct)
    {
        var ticketTypes = await _ticketTypeRepo.GetByEventAsync(eventId, ct);
        return Result<List<TicketTypeResponse>>.Success(ticketTypes.Select(MapToResponse).ToList());
    }

    public async Task<Result<TicketTypeResponse>> CreateAsync(string userId, Guid eventId, CreateTicketTypeRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<TicketTypeResponse>.Failure("Event not found", ResultError.NotFound);
        if (eventEntity.OrganizerId != userId)
            return Result<TicketTypeResponse>.Failure("Not authorized", ResultError.Forbidden);

        var ticketType = new TicketType
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = request.Name,
            Price = request.Price,
            Quota = request.Quota,
            SoldCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _ticketTypeRepo.Add(ticketType);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<TicketTypeResponse>.Success(MapToResponse(ticketType));
    }

    public async Task<Result<TicketTypeResponse>> UpdateAsync(string userId, Guid eventId, Guid ticketTypeId, UpdateTicketTypeRequest request, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<TicketTypeResponse>.Failure("Event not found", ResultError.NotFound);
        if (eventEntity.OrganizerId != userId)
            return Result<TicketTypeResponse>.Failure("Not authorized", ResultError.Forbidden);

        var ticketType = await _ticketTypeRepo.GetByIdAsync(ticketTypeId, ct);
        if (ticketType == null || ticketType.EventId != eventId)
            return Result<TicketTypeResponse>.Failure("Ticket type not found", ResultError.NotFound);

        if (request.Quota.HasValue && request.Quota.Value < ticketType.SoldCount)
            return Result<TicketTypeResponse>.Failure($"Quota cannot be less than sold count ({ticketType.SoldCount})");

        if (request.Name != null) ticketType.Name = request.Name;
        if (request.Price.HasValue) ticketType.Price = request.Price.Value;
        if (request.Quota.HasValue) ticketType.Quota = request.Quota.Value;
        ticketType.UpdatedAt = DateTime.UtcNow;

        _ticketTypeRepo.Update(ticketType);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<TicketTypeResponse>.Success(MapToResponse(ticketType));
    }

    public async Task<Result<bool>> DeleteAsync(string userId, Guid eventId, Guid ticketTypeId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.GetByIdAsync(eventId, ct);
        if (eventEntity == null)
            return Result<bool>.Failure("Event not found", ResultError.NotFound);
        if (eventEntity.OrganizerId != userId)
            return Result<bool>.Failure("Not authorized", ResultError.Forbidden);

        var ticketType = await _ticketTypeRepo.GetByIdAsync(ticketTypeId, ct);
        if (ticketType == null || ticketType.EventId != eventId)
            return Result<bool>.Failure("Ticket type not found", ResultError.NotFound);
        if (ticketType.SoldCount > 0)
            return Result<bool>.Failure("Cannot delete ticket type with sold tickets", ResultError.Conflict);

        _ticketTypeRepo.Remove(ticketType);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    private static TicketTypeResponse MapToResponse(TicketType tt) => new(
        tt.Id, tt.Name, tt.Description, tt.Price, tt.Quota, tt.SoldCount, tt.Quota - tt.SoldCount, tt.MaxPerUser, tt.SaleStartAt, tt.SaleEndAt
    );
}
