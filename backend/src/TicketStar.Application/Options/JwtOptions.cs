namespace TicketStar.Application.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; init; } = "";
    public string Issuer { get; init; } = "";
    public string Audience { get; init; } = "";
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 7;
}
