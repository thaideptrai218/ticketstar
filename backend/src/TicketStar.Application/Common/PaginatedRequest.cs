namespace TicketStar.Application.Common;

public record PaginatedRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Sort { get; init; }
    public string? Search { get; init; }
    /// <summary>Category filter: featured | trending | this-week | this-month</summary>
    public string? Filter { get; init; }
    /// <summary>Partial match on Venue (location search)</summary>
    public string? Location { get; init; }
    /// <summary>Exact match on Category field (e.g. Music, Sports)</summary>
    public string? Category { get; init; }
    /// <summary>Custom date range start (inclusive, UTC). Used when Filter = "custom".</summary>
    public DateTime? DateFrom { get; init; }
    /// <summary>Custom date range end (inclusive, UTC). Used when Filter = "custom".</summary>
    public DateTime? DateTo { get; init; }
    public int ClampedPageSize => Math.Clamp(PageSize, 1, 100);
}

public record CursorPaginatedRequest
{
    public string? After { get; init; }
    public string? Before { get; init; }
    public int Limit { get; init; } = 20;
    public int ClampedLimit => Math.Clamp(Limit, 1, 100);
}
