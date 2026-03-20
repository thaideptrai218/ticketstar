using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class OrganizerCollaboratorRepository : EfRepository<OrganizerCollaborator>, IOrganizerCollaboratorRepository
{
    public OrganizerCollaboratorRepository(AppDbContext db) : base(db) { }

    public async Task<List<OrganizerCollaborator>> GetByOrganizerProfileAsync(string profileId, CancellationToken ct = default)
        => await DbSet
            .Where(x => x.OrganizerProfileId == profileId)
            .Include(x => x.User).ThenInclude(u => u!.Profile)
            .Include(x => x.Inviter)
            .ToListAsync(ct);

    public async Task<List<OrganizerCollaborator>> GetActiveByUserAsync(string userId, CancellationToken ct = default)
        => await DbSet
            .Where(x => x.UserId == userId &&
                        (x.Status == CollaboratorStatus.Pending || x.Status == CollaboratorStatus.Accepted))
            .Include(x => x.OrganizerProfile)
            .ToListAsync(ct);

    public async Task<OrganizerCollaborator?> GetByTokenAsync(string inviteToken, CancellationToken ct = default)
        => await DbSet
            .Include(x => x.OrganizerProfile)
            .FirstOrDefaultAsync(x => x.InviteToken == inviteToken, ct);

    public async Task<OrganizerCollaborator?> GetByEmailAndProfileAsync(string email, string profileId, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(x => x.Email == email && x.OrganizerProfileId == profileId, ct);

    public async Task<List<OrganizerCollaborator>> GetPendingByEmailAsync(string email, CancellationToken ct = default)
        => await DbSet
            .Where(x => x.Email == email && x.UserId == null && x.Status == CollaboratorStatus.Pending)
            .ToListAsync(ct);
}
