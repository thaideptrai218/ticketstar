# Phase 3: Middleware + ApiControllerBase

**Status:** Pending
**Blocked By:** Phase 1 (needs Result, ApiResponse types)
**Effort:** Small

---

## Overview

Add global exception middleware as safety net. Create ApiControllerBase that converts Result objects into standardized ApiResponse envelopes.

## Files to Create

### 1. `TicketStar.API/Middleware/GlobalExceptionMiddleware.cs`

```csharp
namespace TicketStar.API.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                error = "An internal error occurred.",
                traceId = context.TraceIdentifier
            });
        }
    }
}
```

### 2. `TicketStar.API/Controllers/ApiControllerBase.cs`

```csharp
namespace TicketStar.API.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult FromResult<T>(Result<T> result)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? Ok(ApiResponse<T>.Ok(result.Value!, traceId))
            : StatusCode(result.StatusCode, ApiResponse<T>.Fail(result.Error!, traceId));
    }

    protected IActionResult FromResult(Result result, string? successMessage = null)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? Ok(ApiResponse.Ok(successMessage, traceId))
            : StatusCode(result.StatusCode, ApiResponse.Fail(result.Error!, traceId));
    }

    protected IActionResult CreatedFromResult<T>(Result<T> result, string actionName, object? routeValues)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? CreatedAtAction(actionName, routeValues, ApiResponse<T>.Ok(result.Value!, traceId))
            : StatusCode(result.StatusCode, ApiResponse<T>.Fail(result.Error!, traceId));
    }
}
```

## Files to Modify

### 3. `Program.cs`

- Add `app.UseMiddleware<GlobalExceptionMiddleware>();` as FIRST middleware (before CORS, auth, etc.)

## Todo

- [ ] Create Middleware/ directory
- [ ] Create GlobalExceptionMiddleware.cs
- [ ] Create ApiControllerBase.cs
- [ ] Register middleware in Program.cs
- [ ] Verify build compiles

---

**Last Updated:** 2026-02-27
