namespace TicketStar.Application.Options;

public class MfaOptions
{
    public const string SectionName = "Mfa";

    public string Issuer { get; init; } = "TicketStar";
}
