using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Interfaces;

public interface IEventCollaboratorRepository : IRepository<EventCollaborator>
{
    Task<List<EventCollaborator>> GetByEventAsync(Guid eventId, CancellationToken ct = default);
    Task<List<EventCollaborator>> GetByUserAsync(string userId, CancellationToken ct = default);
    Task<EventCollaborator?> GetByTokenAsync(string inviteToken, CancellationToken ct = default);
    Task<EventCollaborator?> GetByEmailAndEventAsync(string email, Guid eventId, CancellationToken ct = default);
    Task<bool> IsCollaboratorAsync(string userId, Guid eventId, CancellationToken ct = default);
    Task<CollaboratorPermissionLevel?> GetPermissionLevelAsync(string userId, Guid eventId, CancellationToken ct = default);
}
