using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.Interfaces;
using TicketStar.Application.DTOs.Orders;

namespace TicketStar.API.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(IOrderService orderService, ILogger<WebhooksController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    [HttpPost("sepay")]
    public async Task<IActionResult> SePayWebhook([FromBody] SePayWebhookRequest request, CancellationToken ct)
    {
        _logger.LogInformation("Received SePay webhook: {Content}", request.Content);

        if (!Request.Headers.TryGetValue("X-Signature", out var signatureValues))
        {
            _logger.LogWarning("SePay webhook missing signature");
            return Unauthorized(new { error = "Missing signature" });
        }

        var signature = signatureValues.FirstOrDefault() ?? "";

        using var reader = new StreamReader(Request.Body);
        var jsonPayload = await reader.ReadToEndAsync(ct);

        var result = await _orderService.ProcessSePayWebhookAsync(jsonPayload, signature, ct);

        if (!result.IsSuccess)
        {
            _logger.LogError("SePay webhook failed: {Error}", result.Error);
            return BadRequest(new { error = result.Error });
        }

        return Ok(new { message = "Webhook processed" });
    }

    [HttpPost("sepay/test")]
    [Authorize]
    public async Task<IActionResult> TestSePayWebhook(CancellationToken ct)
    {
        var testOrderRef = Guid.NewGuid();
        var testPayload = $"{{\"id\":12345,\"gateway\":\"sepay\",\"transactionCode\":\"TEST123\",\"amount\":100000,\"content\":\"ORDER:{testOrderRef}\",\"transferType\":\"in\"}}";

        var result = await _orderService.ProcessSePayWebhookAsync(testPayload, "test-signature", ct);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return Ok(result.Value);
    }
}
