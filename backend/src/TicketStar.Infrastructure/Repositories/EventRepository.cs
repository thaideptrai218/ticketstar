using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Common;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
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
        var now = DateTime.UtcNow;

        IQueryable<Event> query = DbSet.Include(e => e.TicketTypes);

        // Full-text search across title and venue
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = $"%{request.Search}%";
            query = query.Where(e =>
                EF.Functions.Like(e.Title, term) ||
                EF.Functions.Like(e.Venue, term));
        }

        // Location filter — partial match on Venue
        if (!string.IsNullOrWhiteSpace(request.Location))
        {
            var locTerm = $"%{request.Location}%";
            query = query.Where(e => EF.Functions.Like(e.Venue, locTerm));
        }

        // Category filter — exact (case-insensitive) match
        if (!string.IsNullOrWhiteSpace(request.Category))
            query = query.Where(e => e.Category == request.Category);

        // Time/popularity filters — all restrict to Published events with appropriate ordering
        query = request.Filter switch
        {
            // Upcoming events ordered by popularity (most tickets sold first)
            "featured" => query
                .Where(e => e.Status == EventStatus.Published && e.StartAt > now)
                .OrderByDescending(e => e.TicketTypes.Sum(t => t.SoldCount))
                .ThenBy(e => e.StartAt),

            // All published events ordered by total ticket sales
            "trending" => query
                .Where(e => e.Status == EventStatus.Published)
                .OrderByDescending(e => e.TicketTypes.Sum(t => t.SoldCount)),

            // Published events starting today (UTC)
            "today" => query
                .Where(e => e.Status == EventStatus.Published && e.StartAt >= now.Date && e.StartAt < now.Date.AddDays(1))
                .OrderBy(e => e.StartAt),

            // Published events starting tomorrow (UTC)
            "tomorrow" => query
                .Where(e => e.Status == EventStatus.Published && e.StartAt >= now.Date.AddDays(1) && e.StartAt < now.Date.AddDays(2))
                .OrderBy(e => e.StartAt),

            // Published events starting within the next 7 days
            "this-week" => query
                .Where(e => e.Status == EventStatus.Published && e.StartAt >= now && e.StartAt <= now.AddDays(7))
                .OrderBy(e => e.StartAt),

            // Published events starting within the next 30 days
            "this-month" => query
                .Where(e => e.Status == EventStatus.Published && e.StartAt >= now && e.StartAt <= now.AddDays(30))
                .OrderBy(e => e.StartAt),

            // Custom date range — requires DateFrom and/or DateTo
            // DateFrom/DateTo are midnight UTC of the selected local dates
            // Add 1 day to DateTo to cover the full selected day (exclusive upper bound)
            "custom" => query
                .Where(e => e.Status == EventStatus.Published
                    && (request.DateFrom == null || e.StartAt >= request.DateFrom)
                    && (request.DateTo == null || e.StartAt < request.DateTo.Value.AddDays(1)))
                .OrderBy(e => e.StartAt),

            // Default: all events newest first (existing behaviour)
            _ => query
                .OrderByDescending(e => e.CreatedAt)
                .ThenBy(e => e.Title)
        };

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
