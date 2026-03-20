using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IOrganizerCollaboratorRepository : IRepository<OrganizerCollaborator>
{
    Task<List<OrganizerCollaborator>> GetByOrganizerProfileAsync(string profileId, CancellationToken ct = default);
    Task<List<OrganizerCollaborator>> GetActiveByUserAsync(string userId, CancellationToken ct = default);
    Task<OrganizerCollaborator?> GetByTokenAsync(string inviteToken, CancellationToken ct = default);
    Task<OrganizerCollaborator?> GetByEmailAndProfileAsync(string email, string profileId, CancellationToken ct = default);
    Task<List<OrganizerCollaborator>> GetPendingByEmailAsync(string email, CancellationToken ct = default);
}
