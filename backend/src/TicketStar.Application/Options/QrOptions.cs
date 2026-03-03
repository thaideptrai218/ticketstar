namespace TicketStar.Application.Options;

public class QrOptions
{
    public const string SectionName = "Qr";

    public string HmacSecret { get; init; } = "";
    public int QrCodeSize { get; init; } = 300;
    public int QrExpiryHoursAfterEventStart { get; init; } = 24;
}
