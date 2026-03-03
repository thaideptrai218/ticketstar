namespace TicketStar.Application.Options;

public class SePayOptions
{
    public const string SectionName = "SePay";

    public string ApiKey { get; init; } = "";
    public string SecretKey { get; init; } = "";
    public string WebhookPath { get; init; } = "/api/webhooks/sepay";
    public bool UseMock { get; init; } = true;
}
