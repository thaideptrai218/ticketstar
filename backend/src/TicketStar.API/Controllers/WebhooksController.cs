using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ApiControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(IOrderService orderService, ILogger<WebhooksController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    [HttpPost("sepay")]
    public async Task<IActionResult> SePayWebhook(CancellationToken ct)
    {
        // Read raw body for signature validation (don't use [FromBody])
        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body);
        var jsonPayload = await reader.ReadToEndAsync(ct);

        _logger.LogInformation("Received SePay webhook payload");

        if (!Request.Headers.TryGetValue("X-Signature", out var signatureValues))
        {
            _logger.LogWarning("SePay webhook missing signature");
            return Unauthorized(new { error = "Missing signature" });
        }

        var signature = signatureValues.FirstOrDefault() ?? "";
        var result = await _orderService.ProcessSePayWebhookAsync(jsonPayload, signature, ct);

        if (!result.IsSuccess)
        {
            _logger.LogError("SePay webhook failed: {Error}", result.Error);
            return BadRequest(new { error = result.Error });
        }

        return Ok(new { message = "Webhook processed" });
    }
}
