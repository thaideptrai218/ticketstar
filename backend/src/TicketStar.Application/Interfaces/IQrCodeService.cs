using TicketStar.Application.DTOs.Qr;

namespace TicketStar.Application.Interfaces;

public interface IQrCodeService
{
    string GenerateQrCodeBase64(string content);
    string GenerateTicketPayload(Guid ticketId, Guid eventId, Guid userId);
    string GenerateHmac(string payload);
    bool VerifyQrCode(string qrData, string signature);
    TicketQrData? ParseTicketQr(string qrData);
    bool IsQrExpired(DateTime eventStartUtc);
}
