using System.Security.Claims;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Middleware;

/// <summary>
/// Checks the Redis token blacklist on every authenticated request.
/// Compares the JWT "iat" (issued-at) claim against the user's blacklist timestamp.
/// If iat &lt; blacklistTimestamp, the token was issued before a critical revocation event — return 401.
/// Fail-open: if Redis is unavailable, the request is allowed through.
/// </summary>
public class TokenBlacklistMiddleware
{
    private readonly RequestDelegate _next;

    public TokenBlacklistMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITokenBlacklist tokenBlacklist)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? context.User.FindFirstValue("sub");

            var iatClaim = context.User.FindFirstValue("iat");

            if (userId != null && iatClaim != null && long.TryParse(iatClaim, out var iatUnix))
            {
                var issuedAt = DateTimeOffset.FromUnixTimeSeconds(iatUnix).UtcDateTime;
                var blacklistTs = await tokenBlacklist.GetBlacklistTimestampAsync(userId);

                if (blacklistTs.HasValue && issuedAt < blacklistTs.Value)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Token revoked.");
                    return;
                }
            }
        }

        await _next(context);
    }
}
