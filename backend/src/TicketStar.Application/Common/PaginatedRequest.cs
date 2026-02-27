namespace TicketStar.Application.Common;

public record PaginatedRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Sort { get; init; }
    public string? Search { get; init; }
    public int ClampedPageSize => Math.Clamp(PageSize, 1, 100);
}

public record CursorPaginatedRequest
{
    public string? After { get; init; }
    public string? Before { get; init; }
    public int Limit { get; init; } = 20;
    public int ClampedLimit => Math.Clamp(Limit, 1, 100);
}
