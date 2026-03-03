using TicketStar.Application.DTOs.SePay;

namespace TicketStar.Application.Interfaces;

public interface ISePayWebhookHandler
{
    bool ValidateSignature(string payload, string signature);
    SePayWebhookPayload? ParsePayload(string json);
    string? ExtractOrderReference(string content);
}
