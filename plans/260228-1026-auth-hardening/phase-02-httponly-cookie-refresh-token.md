# Phase 2: HttpOnly Cookie + Security Headers

## Context Links

- [AuthController.cs](../../backend/src/TicketStar.API/Controllers/AuthController.cs) - endpoints that issue/consume refresh tokens
- [TokenService.cs](../../backend/src/TicketStar.Application/Services/TokenService.cs) - `GenerateTokenPairAsync`, `RefreshTokenAsync`
- [AuthDtos.cs](../../backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs) - `TokenResponse`, `RefreshRequest`
- [Program.cs](../../backend/src/TicketStar.API/Program.cs) - CORS config with `AllowCredentials()` already set

## Overview

- **Priority:** HIGH (Security Critical)
- **Status:** pending
- **Description:** Move refresh token from JSON response body to `HttpOnly`, `Secure`, `SameSite=Strict` cookie. Access token stays in response body (short-lived). Eliminates XSS-based token theft. Also adds HTTPS/HSTS enforcement (H1), security response headers (H2), and logout token ownership validation (H4).

## Key Insights

- Current: refresh token returned in `TokenResponse.RefreshToken` and sent back in `RefreshRequest.RefreshToken` body
- CORS already has `AllowCredentials()` -- cookies will be sent cross-origin to allowed origins
- `SameSite=Strict` + `Secure` + `HttpOnly` eliminates need for separate CSRF token (strict same-site blocks cross-origin cookie sending)
- `TokenResponse` record used by 5 endpoints: Register, Login, GoogleLogin, VerifyMagicLink, Refresh
- Frontend must add `credentials: 'include'` to fetch calls

## Requirements

### Functional

- Refresh token set as `HttpOnly` cookie on successful auth (login, register, google-login, magic-link/verify, refresh)
- Refresh token cleared on logout
- `/refresh` endpoint reads refresh token from cookie, not request body
- Access token + expiry + sessionId still returned in JSON body
- `RefreshRequest` DTO no longer needed for `/refresh` (no body required)
- Logout reads refresh token from cookie too

### Non-Functional

- Cookie path: `/api/auth` (scoped, not sent on other API calls)
- Cookie max-age: match `JwtOptions.RefreshTokenDays` (7 days)
- `SameSite=Strict`, `Secure=true` (in production), `HttpOnly=true`

## Architecture

```
Login/Register/etc -> AuthService returns TokenResponse -> Controller sets cookie + returns body without refresh token

Refresh -> Controller reads cookie -> passes to TokenService -> sets new cookie

Logout -> Controller reads cookie -> passes to AuthService -> clears cookie
```

Key change: the cookie setting/reading happens in the **Controller layer** only. Application layer (`AuthService`, `TokenService`) remains unchanged -- they still accept/return refresh token strings.

## Related Code Files

### Files to Modify

- `backend/src/TicketStar.API/Controllers/AuthController.cs` -- cookie set/read/clear logic
- `backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs` -- new `AccessTokenResponse` DTO (body without refresh token)

### Files to Create

- `backend/src/TicketStar.API/Extensions/CookieExtensions.cs` -- helper to set/clear refresh token cookie

### Files NOT Modified

- `TokenService.cs` -- unchanged, still returns full `TokenResponse`
- `AuthService.cs` -- unchanged, still returns full `TokenResponse`

## Implementation Steps

1. **Create `CookieExtensions.cs`**

    ```csharp
    // backend/src/TicketStar.API/Extensions/CookieExtensions.cs
    namespace TicketStar.API.Extensions;
    public static class CookieExtensions
    {
        public const string RefreshTokenCookieName = "refresh_token";

        public static void SetRefreshTokenCookie(this HttpResponse response, string token, int maxAgeDays)
        {
            response.Cookies.Append(RefreshTokenCookieName, token, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,  // HTTPS only
                SameSite = SameSiteMode.Strict,
                Path = "/api/auth",
                MaxAge = TimeSpan.FromDays(maxAgeDays),
                IsEssential = true
            });
        }

        public static void ClearRefreshTokenCookie(this HttpResponse response)
        {
            response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Path = "/api/auth"
            });
        }

        public static string? GetRefreshTokenCookie(this HttpRequest request)
            => request.Cookies[RefreshTokenCookieName];
    }
    ```

2. **Add `AccessTokenResponse` DTO**

    ```csharp
    // Add to AuthDtos.cs
    public record AccessTokenResponse(
        string AccessToken,
        DateTime ExpiresAt,
        string SessionId);
    ```

    This is what the client receives in JSON body (no refresh token).

3. **Update `AuthController.cs`**
    - Inject `IOptions<JwtOptions>` for `RefreshTokenDays`
    - Create helper `HandleTokenResult(Result<TokenResponse>)` that:
        - Sets refresh token cookie via `Response.SetRefreshTokenCookie()`
        - Returns `AccessTokenResponse` in body (without refresh token)
    - Update all auth endpoints (Register, Login, GoogleLogin, VerifyMagicLink) to use helper
    - Update `Refresh()`: read token from `Request.GetRefreshTokenCookie()`, no body needed
    - Update `Logout()`: read token from cookie, clear cookie after logout

4. **Update `AuthController` endpoint signatures**

    ```csharp
    // Refresh -- no request body needed
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.GetRefreshTokenCookie();
        if (refreshToken is null)
            return Unauthorized();
        var result = await _tokenService.RefreshTokenAsync(refreshToken);
        return HandleTokenResult(result);
    }

    // Logout -- no request body needed
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.GetRefreshTokenCookie();
        if (refreshToken is null)
            return FromResult(Result.Success(), "Logged out successfully.");
        var result = await _authService.LogoutAsync(refreshToken);
        Response.ClearRefreshTokenCookie();
        return FromResult(result, "Logged out successfully.");
    }
    ```

5. **Frontend changes** (document for frontend team)
    - All auth API calls: add `credentials: 'include'` to fetch options
    - Remove `refreshToken` from stored state / localStorage
    - `/refresh` call: no body needed, just POST with credentials
    - `/logout` call: no body needed

## Todo List

- [ ] Create `CookieExtensions.cs` with set/clear/get helpers
- [ ] Add `AccessTokenResponse` record to `AuthDtos.cs`
- [ ] Update `AuthController` constructor to inject `IOptions<JwtOptions>`
- [ ] Add `HandleTokenResult()` private helper to AuthController
- [ ] Update Register, Login, GoogleLogin, VerifyMagicLink to set cookie + return `AccessTokenResponse`
- [ ] Update Refresh to read from cookie
- [ ] Update Logout to read from cookie + clear cookie
- [ ] Remove `RefreshRequest` usage from Refresh and Logout (keep DTO for backward compat if needed)
- [ ] Test: verify cookie is set with correct flags (HttpOnly, Secure, SameSite, Path)
- [ ] Test: verify refresh works via cookie
- [ ] Test: verify logout clears cookie
- [ ] Document frontend migration steps

## Success Criteria

- Refresh token never appears in response body
- Cookie has HttpOnly, Secure, SameSite=Strict, Path=/api/auth
- All auth flows (login, register, google, magic link, refresh, logout) work with cookies
- No XSS vector for refresh token theft

## Risk Assessment

- **Breaking change**: Frontend must update simultaneously. Consider brief transition period accepting both cookie and body.
- **Development environment**: `Secure=true` requires HTTPS. For dev, conditionally set based on `IHostEnvironment.IsDevelopment()`.
- **Cookie size**: Refresh token is 64-byte random -> ~88 chars base64. Well within 4KB cookie limit.

## Security Considerations

- `HttpOnly` prevents JavaScript access (XSS mitigation)
- `Secure` prevents transmission over HTTP
- `SameSite=Strict` prevents CSRF (cookie not sent on cross-site requests)
- `Path=/api/auth` scopes cookie to auth endpoints only (not sent on `/api/events` etc.)
- No need for separate anti-CSRF token given SameSite=Strict

## Code Review Fixes (H1, H2, H4)

### H1: HTTPS Enforcement + HSTS

**Problem:** No HTTPS enforcement or HSTS header. Tokens can be intercepted over HTTP.
**Fix in `Program.cs`:**

```csharp
// Before UseRouting
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}
app.UseHttpsRedirection();
```

Add HSTS config in `ServiceCollectionExtensions`:

```csharp
services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});
```

### H2: Security Response Headers

**Problem:** Missing X-Content-Type-Options, X-Frame-Options, Cache-Control on auth responses.
**Fix:** Add middleware or use `Program.cs` inline:

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("X-XSS-Protection", "0"); // modern browsers: CSP instead
    await next();
});
```

Add `Cache-Control: no-store` specifically on auth endpoints via `CookieExtensions` or controller helper.

### H4: Logout Token Ownership Validation (IDOR)

**Problem:** Any authenticated user can revoke any refresh token by guessing/knowing it. No ownership check.
**Fix in `AuthController.Logout()`:** After reading refresh token from cookie, validate it belongs to the authenticated user:

```csharp
// In TokenService or AuthService, add ownership check:
// 1. Hash the refresh token
// 2. Look up in DB
// 3. Verify stored.UserId == authenticated user's ID
// 4. If mismatch, return Unauthorized
```

This is less critical after Phase 2 (cookie-based, harder to submit someone else's token) but still defense-in-depth.

## Additional Todo Items (from review)

- [ ] Add HSTS + HTTPS redirection (H1)
- [ ] Add security response headers middleware (H2)
- [ ] Add token ownership validation on logout (H4)
- [ ] Conditionally set `Secure=false` on cookies in development mode
- [ ] Remove `RefreshRequest` from `/refresh` and `/logout` endpoints (clean break)

## Next Steps

- Coordinate frontend migration (add `credentials: 'include'`, remove token from state)
