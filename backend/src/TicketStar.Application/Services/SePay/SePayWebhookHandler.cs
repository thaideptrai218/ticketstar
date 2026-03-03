using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using TicketStar.Application.DTOs.SePay;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace TicketStar.Application.Services.SePay;

public class SePayWebhookHandler : ISePayWebhookHandler
{
    private readonly SePayOptions _options;
    private readonly ILogger<SePayWebhookHandler> _logger;

    public SePayWebhookHandler(IOptions<SePayOptions> options, ILogger<SePayWebhookHandler> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool ValidateSignature(string payload, string signature)
    {
        if (_options.UseMock)
        {
            _logger.LogDebug("Using mock SePay validation - signature bypassed");
            return true;
        }

        if (string.IsNullOrEmpty(_options.SecretKey))
        {
            _logger.LogWarning("SePay SecretKey not configured");
            return false;
        }

        var keyBytes = Encoding.UTF8.GetBytes(_options.SecretKey);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        var expectedSignature = Convert.ToHexString(hash).ToLowerInvariant().Replace("-", "");

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedSignature),
            Encoding.UTF8.GetBytes(signature.ToLowerInvariant())
        );
    }

    public SePayWebhookPayload? ParsePayload(string json)
    {
        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            return JsonSerializer.Deserialize<SePayWebhookPayload>(json, options);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse SePay webhook payload");
            return null;
        }
    }

    public string? ExtractOrderReference(string content)
    {
        if (string.IsNullOrEmpty(content)) return null;

        // Expected format: "ORDER:REF-12345" or just "REF-12345"
        var parts = content.Split(':', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var reference = parts.Length > 1 ? parts[^1] : parts[0];

        return Guid.TryParse(reference, out var guid) ? guid.ToString() : null;
    }

    public SePayValidationResult ValidateWebhook(string json, string signature)
    {
        if (!ValidateSignature(json, signature))
        {
            return SePayValidationResult.Invalid("Invalid signature");
        }

        var payload = ParsePayload(json);
        if (payload == null)
        {
            return SePayValidationResult.Invalid("Invalid payload");
        }

        var orderReference = ExtractOrderReference(payload.Content ?? "");
        if (string.IsNullOrEmpty(orderReference))
        {
            return SePayValidationResult.Invalid("No order reference found in content");
        }

        return SePayValidationResult.Valid(payload, orderReference);
    }
}
