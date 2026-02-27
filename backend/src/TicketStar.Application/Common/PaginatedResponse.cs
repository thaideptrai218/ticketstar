namespace TicketStar.Application.Common;

public record PaginatedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)Math.Max(PageSize, 1));
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}

public record CursorPaginatedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public string? StartCursor { get; init; }
    public string? EndCursor { get; init; }
    public bool HasNextPage { get; init; }
    public bool HasPreviousPage { get; init; }
}
