# Phase 1: Common Types (Result, ApiResponse, Pagination)

**Status:** Pending
**Blocked By:** None
**Effort:** Small

---

## Overview

Create shared types in Application layer that all services and controllers use. No existing code changes — purely additive.

## Files to Create

### 1. `TicketStar.Application/Common/ResultError.cs`

```csharp
namespace TicketStar.Application.Common;

/// <summary>
/// Transport-agnostic error classification. Mapped to HTTP status codes in ApiControllerBase.
/// </summary>
public enum ResultError
{
    Validation,    // Bad input (HTTP 400)
    Unauthorized,  // Not authenticated (HTTP 401)
    Forbidden,     // Not authorized (HTTP 403)
    NotFound,      // Resource missing (HTTP 404)
    Conflict,      // Duplicate / state conflict (HTTP 409)
    Internal       // Unexpected failure (HTTP 500)
}
```

### 2. `TicketStar.Application/Common/Result.cs`

```csharp
namespace TicketStar.Application.Common;

public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public ResultError? ErrorType { get; }

    private Result(T value) { IsSuccess = true; Value = value; }
    private Result(string error, ResultError errorType) { IsSuccess = false; Error = error; ErrorType = errorType; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error, ResultError errorType = ResultError.Validation) => new(error, errorType);
}

public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public ResultError? ErrorType { get; }

    private Result() { IsSuccess = true; }
    private Result(string error, ResultError errorType) { IsSuccess = false; Error = error; ErrorType = errorType; }

    public static Result Success() => new();
    public static Result Failure(string error, ResultError errorType = ResultError.Validation) => new(error, errorType);
}
```

### 3. `TicketStar.API/Models/ApiResponse.cs`

> **Note:** ApiResponse is a presentation concern (contains TraceId, HTTP-specific shape). Lives in API layer, not Application.

```csharp
namespace TicketStar.API.Models;

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

### 4. `TicketStar.Application/Common/PaginatedRequest.cs`

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

### 5. `TicketStar.Application/Common/PaginatedResponse.cs`

```csharp
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
```

## Todo

- [ ] Create Common/ directory in Application project
- [ ] Create ResultError.cs (error enum)
- [ ] Create Result.cs
- [ ] Create ApiResponse.cs in **API/Models/** (not Application)
- [ ] Create PaginatedRequest.cs
- [ ] Create PaginatedResponse.cs
- [ ] Verify build compiles

---

**Last Updated:** 2026-02-27
