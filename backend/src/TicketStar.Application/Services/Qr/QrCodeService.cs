using System.Security.Cryptography;
using System.Text;
using QRCoder;
using TicketStar.Application.DTOs.Qr;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace TicketStar.Application.Services.Qr;

public class QrCodeService : IQrCodeService
{
    private readonly QrOptions _options;
    private readonly ILogger<QrCodeService> _logger;

    public QrCodeService(IOptions<QrOptions> options, ILogger<QrCodeService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public string GenerateQrCodeBase64(string content)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrCodeData = qrGenerator.CreateQrCode(content, QRCodeGenerator.ECCLevel.M);

        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeBytes = qrCode.GetGraphic(_options.QrCodeSize);
        return Convert.ToBase64String(qrCodeBytes);
    }

    public string GenerateTicketPayload(Guid ticketId, Guid eventId, Guid userId)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return $"{ticketId}|{eventId}|{userId}|{timestamp}";
    }

    public string GenerateHmac(string payload)
    {
        var keyBytes = Encoding.UTF8.GetBytes(_options.HmacSecret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        return Convert.ToBase64String(hash);
    }

    public bool VerifyQrCode(string qrData, string signature)
    {
        var expectedHmac = GenerateHmac(qrData);

        // Constant-time comparison to prevent timing attacks
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedHmac),
            Encoding.UTF8.GetBytes(signature)
        );
    }

    public TicketQrData? ParseTicketQr(string qrData)
    {
        var parts = qrData.Split('|');
        if (parts.Length != 4) return null;

        if (!Guid.TryParse(parts[0], out var ticketId)) return null;
        if (!Guid.TryParse(parts[1], out var eventId)) return null;
        if (!Guid.TryParse(parts[2], out var userId)) return null;
        if (!long.TryParse(parts[3], out var timestamp)) return null;

        return new TicketQrData
        {
            TicketId = ticketId,
            EventId = eventId,
            UserId = userId,
            Timestamp = timestamp
        };
    }

    public bool IsQrExpired(DateTime eventStartUtc)
    {
        var expiryTime = eventStartUtc.AddHours(_options.QrExpiryHoursAfterEventStart);
        return DateTime.UtcNow > expiryTime;
    }
}
