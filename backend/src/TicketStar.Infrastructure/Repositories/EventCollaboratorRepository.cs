using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class EventCollaboratorRepository : EfRepository<EventCollaborator>, IEventCollaboratorRepository
{
    public EventCollaboratorRepository(AppDbContext db) : base(db) { }

    public async Task<List<EventCollaborator>> GetByEventAsync(Guid eventId, CancellationToken ct = default)
        => await DbSet
            .Where(x => x.EventId == eventId)
            .Include(x => x.User)
            .Include(x => x.Inviter)
            .ToListAsync(ct);

    public async Task<List<EventCollaborator>> GetByUserAsync(string userId, CancellationToken ct = default)
        => await DbSet
            .Where(x => x.UserId == userId && x.Status == CollaboratorStatus.Accepted)
            .Include(x => x.Event)
            .ToListAsync(ct);

    public async Task<EventCollaborator?> GetByTokenAsync(string inviteToken, CancellationToken ct = default)
        => await DbSet
            .Include(x => x.Event)
            .FirstOrDefaultAsync(x => x.InviteToken == inviteToken, ct);

    public async Task<EventCollaborator?> GetByEmailAndEventAsync(string email, Guid eventId, CancellationToken ct = default)
        => await DbSet
            .FirstOrDefaultAsync(x => x.Email == email && x.EventId == eventId, ct);

    public async Task<bool> IsCollaboratorAsync(string userId, Guid eventId, CancellationToken ct = default)
        => await DbSet
            .AnyAsync(x => x.UserId == userId && x.EventId == eventId && x.Status == CollaboratorStatus.Accepted, ct);

    public async Task<CollaboratorPermissionLevel?> GetPermissionLevelAsync(string userId, Guid eventId, CancellationToken ct = default)
    {
        var collaborator = await DbSet
            .FirstOrDefaultAsync(x => x.UserId == userId && x.EventId == eventId && x.Status == CollaboratorStatus.Accepted, ct);
        return collaborator?.PermissionLevel;
    }
}
