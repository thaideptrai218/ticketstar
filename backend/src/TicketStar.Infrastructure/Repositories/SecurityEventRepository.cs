using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class SecurityEventRepository : EfRepository<SecurityEvent>, ISecurityEventRepository
{
    public SecurityEventRepository(AppDbContext db) : base(db) { }
}
