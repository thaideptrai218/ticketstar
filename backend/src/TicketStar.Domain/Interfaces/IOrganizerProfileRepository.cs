using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IOrganizerProfileRepository : IRepository<OrganizerProfile>
{
    Task<OrganizerProfile?> GetByUserIdAsync(string userId, CancellationToken ct = default);
}
