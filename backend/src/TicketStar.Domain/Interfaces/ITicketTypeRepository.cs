using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface ITicketTypeRepository : IRepository<TicketType>
{
    Task<List<TicketType>> GetByEventAsync(Guid eventId, CancellationToken ct = default);
    Task<int> GetSoldCountAsync(Guid ticketTypeId, CancellationToken ct = default);
    Task IncrementSoldCountAsync(Guid ticketTypeId, int quantity, CancellationToken ct = default);
    Task<bool> IsAvailableAsync(Guid ticketTypeId, int quantity, CancellationToken ct = default);
}
