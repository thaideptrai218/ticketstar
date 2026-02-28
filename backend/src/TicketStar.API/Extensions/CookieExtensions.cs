namespace TicketStar.API.Extensions;

public static class CookieExtensions
{
    public const string RefreshTokenCookieName = "refresh_token";

    /// <summary>
    /// Sets the refresh token as an HttpOnly, Secure, SameSite=Strict cookie scoped to /api/auth.
    /// In development, Secure is set to false so HTTP works without a certificate.
    /// </summary>
    public static void SetRefreshTokenCookie(
        this HttpResponse response, string token, int maxAgeDays, bool isHttps)
    {
        response.Cookies.Append(RefreshTokenCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth",
            MaxAge = TimeSpan.FromDays(maxAgeDays),
            IsEssential = true
        });
    }

    /// <summary>Clears the refresh token cookie (sets expired).</summary>
    public static void ClearRefreshTokenCookie(this HttpResponse response, bool isHttps)
    {
        response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/api/auth"
        });
    }

    public static string? GetRefreshTokenCookie(this HttpRequest request)
        => request.Cookies[RefreshTokenCookieName];
}
