using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface ICheckInRepository : IRepository<CheckIn>
{
    Task<CheckIn?> GetByTicketAsync(Guid ticketId, CancellationToken ct = default);
    Task<List<CheckIn>> GetByEventAsync(Guid eventId, CancellationToken ct = default);
    Task<int> GetCheckInCountAsync(Guid eventId, CancellationToken ct = default);
}
