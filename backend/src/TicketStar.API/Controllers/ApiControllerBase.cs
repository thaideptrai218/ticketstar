using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using TicketStar.API.Models;
using TicketStar.Application.Common;

namespace TicketStar.API.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected string? GetUserId()
        => User.FindFirstValue(ClaimTypes.NameIdentifier)
           ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

    protected string? GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    protected string? GetUserAgent() => Request.Headers.UserAgent.ToString();

    protected bool IsHttps => Request.IsHttps || Request.Headers["X-Forwarded-Proto"] == "https";


    /// <summary>
    /// Maps transport-agnostic ResultError to HTTP status codes.
    /// Single mapping point — Application layer stays HTTP-unaware.
    /// </summary>
    private static int ToHttpStatus(ResultError? errorType) => errorType switch
    {
        ResultError.Validation   => StatusCodes.Status400BadRequest,
        ResultError.Unauthorized => StatusCodes.Status401Unauthorized,
        ResultError.Forbidden    => StatusCodes.Status403Forbidden,
        ResultError.NotFound     => StatusCodes.Status404NotFound,
        ResultError.Conflict     => StatusCodes.Status409Conflict,
        ResultError.Internal     => StatusCodes.Status500InternalServerError,
        _                        => StatusCodes.Status400BadRequest
    };

    protected IActionResult FromResult<T>(Result<T> result)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? Ok(ApiResponse<T>.Ok(result.Value!, traceId))
            : StatusCode(ToHttpStatus(result.ErrorType), ApiResponse<T>.Fail(result.Error!, traceId));
    }

    protected IActionResult FromResult(Result result, string? successMessage = null)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? Ok(ApiResponse.Ok(successMessage, traceId))
            : StatusCode(ToHttpStatus(result.ErrorType), ApiResponse.Fail(result.Error!, traceId));
    }

    protected IActionResult CreatedFromResult<T>(Result<T> result, string? actionName = null, object? routeValues = null)
    {
        var traceId = HttpContext.TraceIdentifier;
        if (!result.IsSuccess)
            return StatusCode(ToHttpStatus(result.ErrorType), ApiResponse<T>.Fail(result.Error!, traceId));

        if (actionName is not null)
            return CreatedAtAction(actionName, routeValues, ApiResponse<T>.Ok(result.Value!, traceId));

        // 201 without Location header (e.g., auth endpoints)
        return StatusCode(StatusCodes.Status201Created, ApiResponse<T>.Ok(result.Value!, traceId));
    }
}
