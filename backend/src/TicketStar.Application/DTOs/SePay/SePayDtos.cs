namespace TicketStar.Application.DTOs.SePay;

public class SePayWebhookPayload
{
    public long Id { get; set; }
    public string? Gateway { get; set; }
    public string? TransactionCode { get; set; }
    public decimal Amount { get; set; }
    public string? Content { get; set; }
    public string? TransferType { get; set; }
    public string? TransferDate { get; set; }
}

public class SePayValidationResult
{
    public bool IsValid { get; init; }
    public SePayWebhookPayload? Payload { get; init; }
    public string? OrderReference { get; init; }
    public string? Error { get; init; }

    public static SePayValidationResult Valid(SePayWebhookPayload payload, string orderReference) =>
        new() { IsValid = true, Payload = payload, OrderReference = orderReference };

    public static SePayValidationResult Invalid(string error) =>
        new() { IsValid = false, Error = error };
}
