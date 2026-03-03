namespace TicketStar.Domain.Common;

public record PaginatedRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Sort { get; init; }
    public string? Search { get; init; }
    public int ClampedPageSize => Math.Clamp(PageSize, 1, 100);
}

public record PaginatedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Total { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling(Total / (double)Math.Max(PageSize, 1));
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}
