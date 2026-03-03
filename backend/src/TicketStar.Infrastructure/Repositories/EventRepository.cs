using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Common;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

public class EventRepository : EfRepository<Event>, IEventRepository
{
    public EventRepository(AppDbContext db) : base(db) { }

    public async Task<Event?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(e => e.Slug == slug, ct);

    public async Task<List<Event>> GetByOrganizerAsync(string organizerId, CancellationToken ct = default)
        => await DbSet
            .Where(e => e.OrganizerId == organizerId)
            .Include(e => e.TicketTypes)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(ct);

    public async Task<PaginatedResponse<Event>> ListPaginatedAsync(PaginatedRequest request, CancellationToken ct = default)
    {
        var query = DbSet
            .Include(e => e.TicketTypes)
            .OrderByDescending(e => e.CreatedAt)
            .ThenBy(e => e.Title);

        var total = await query.CountAsync(ct);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        return new PaginatedResponse<Event>
        {
            Items = items,
            Total = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    public async Task<List<Event>> SearchAsync(string query, CancellationToken ct = default)
    {
        var searchTerm = $"%{query}%";
        return await DbSet
            .Where(e => EF.Functions.Like(e.Title, searchTerm) ||
                       EF.Functions.Like(e.Description, searchTerm) ||
                       EF.Functions.Like(e.Venue, searchTerm))
            .Include(e => e.TicketTypes)
            .OrderByDescending(e => e.StartAt)
            .ToListAsync(ct);
    }

    public async Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default)
        => await DbSet.AnyAsync(e => e.Slug == slug, ct);
}
