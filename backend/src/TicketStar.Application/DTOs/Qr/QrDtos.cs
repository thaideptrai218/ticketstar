namespace TicketStar.Application.DTOs.Qr;

public class TicketQrData
{
    public Guid TicketId { get; init; }
    public Guid EventId { get; init; }
    public Guid UserId { get; init; }
    public long Timestamp { get; init; }

    public DateTime UtcTimestamp => DateTimeOffset.FromUnixTimeSeconds(Timestamp).UtcDateTime;
}

public class QrCodeResult
{
    public string Base64Image { get; init; } = "";
    public string Payload { get; init; } = "";
    public string Signature { get; init; } = "";
}
