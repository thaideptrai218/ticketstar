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
    RateLimited,   // Too many requests (HTTP 429)
    Internal       // Unexpected failure (HTTP 500)
}
