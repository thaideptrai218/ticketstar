using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface IMagicLinkRepository : IRepository<MagicLink>
{
    Task<MagicLink?> GetByHashWithUserAsync(string tokenHash, CancellationToken ct = default);
}
