using TicketStar.Domain.Entities;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

/// <summary>
/// AuthSession uses the generic EfRepository — no custom queries needed yet.
/// Registered as IRepository&lt;AuthSession&gt; via open generic DI.
/// </summary>
public class AuthSessionRepository : EfRepository<AuthSession>
{
    public AuthSessionRepository(AppDbContext db) : base(db) { }
}
