using TicketStar.Domain.Common;
using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IEventRepository : IRepository<Event>
{
    Task<Event?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<List<Event>> GetByOrganizerAsync(string organizerId, CancellationToken ct = default);
    Task<PaginatedResponse<Event>> ListPaginatedAsync(PaginatedRequest request, CancellationToken ct = default);
    Task<List<Event>> SearchAsync(string query, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);
}
