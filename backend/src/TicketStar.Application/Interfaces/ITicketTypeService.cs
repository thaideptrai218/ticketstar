using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Events;

namespace TicketStar.Application.Interfaces;

public interface ITicketTypeService
{
    Task<Result<List<TicketTypeResponse>>> ListByEventAsync(Guid eventId, CancellationToken ct);
    Task<Result<TicketTypeResponse>> CreateAsync(string userId, Guid eventId, CreateTicketTypeRequest request, CancellationToken ct);
    Task<Result<TicketTypeResponse>> UpdateAsync(string userId, Guid eventId, Guid ticketTypeId, UpdateTicketTypeRequest request, CancellationToken ct);
    Task<Result<bool>> DeleteAsync(string userId, Guid eventId, Guid ticketTypeId, CancellationToken ct);
}
