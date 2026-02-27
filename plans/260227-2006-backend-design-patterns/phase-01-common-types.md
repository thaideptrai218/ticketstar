# Phase 1: Common Types (Result, ApiResponse, Pagination)

**Status:** Pending
**Blocked By:** None
**Effort:** Small

---

## Overview

Create shared types in Application layer that all services and controllers use. No existing code changes — purely additive.

## Files to Create

### 1. `TicketStar.Application/Common/Result.cs`

```csharp
namespace TicketStar.Application.Common;

public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public int StatusCode { get; }

    private Result(T value) { IsSuccess = true; Value = value; StatusCode = 200; }
    private Result(string error, int statusCode) { IsSuccess = false; Error = error; StatusCode = statusCode; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error, int statusCode = 400) => new(error, statusCode);
}

public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public int StatusCode { get; }

    private Result() { IsSuccess = true; StatusCode = 200; }
    private Result(string error, int statusCode) { IsSuccess = false; Error = error; StatusCode = statusCode; }

    public static Result Success() => new();
    public static Result Failure(string error, int statusCode = 400) => new(error, statusCode);
}
```

### 2. `TicketStar.Application/Common/ApiResponse.cs`

```csharp
namespace TicketStar.Application.Common;

public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public string? TraceId { get; init; }

    public static ApiResponse<T> Ok(T data, string? traceId = null)
        => new() { Success = true, Data = data, TraceId = traceId };

    public static ApiResponse<T> Fail(string error, string? traceId = null)
        => new() { Success = false, Error = error, TraceId = traceId };
}

public class ApiResponse
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public string? Error { get; init; }
    public string? TraceId { get; init; }

    public static ApiResponse Ok(string? message = null, string? traceId = null)
        => new() { Success = true, Message = message, TraceId = traceId };

    public static ApiResponse Fail(string error, string? traceId = null)
        => new() { Success = false, Error = error, TraceId = traceId };
}
```

### 3. `TicketStar.Application/Common/PaginatedRequest.cs`

```csharp
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
```

### 4. `TicketStar.Application/Common/PaginatedResponse.cs`

```csharp
namespace TicketStar.Application.Common;

public record PaginatedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
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
```

## Todo

- [ ] Create Common/ directory in Application project
- [ ] Create Result.cs
- [ ] Create ApiResponse.cs
- [ ] Create PaginatedRequest.cs
- [ ] Create PaginatedResponse.cs
- [ ] Verify build compiles

---

**Last Updated:** 2026-02-27
