# Phase 6: External Integration

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-04-order-ticket-service.md](phase-04-order-ticket-service.md), [phase-01-infrastructure-setup.md](phase-01-infrastructure-setup.md)

## Overview
**Priority**: P1 (Blocking Payment)
**Status**: Pending
**Effort**: 1.5 hours

Implement SePay webhook controller and Google OAuth token validation extension. SePay webhooks trigger order completion; Google token validation for OAuth login (already exists but needs extraction for reuse).

## Key Insights

- SePay webhook is public endpoint (no auth)
- Webhook security: HMAC signature validation
- Google token validation exists in AuthService - extract to shared service
- Need webhook controller with proper error responses
- SePay expects 200 OK on success (to stop retries)

## Requirements

### Functional
1. SePay webhook controller endpoint
2. Signature validation before processing
3. Order lookup by reference from webhook content
4. Proper error responses (don't reveal internal errors)
5. Extract Google token validation to reusable service

### Non-Functional
- Idempotent webhook handling
- Fast response (< 1s) to avoid SePay timeout
- Log all webhook payloads for audit
- Graceful handling of malformed webhooks

## Architecture

```
SePay → WebhooksController → ISePayWebhookHandler (validate signature)
                              ↓
                          IOrderService.ProcessSePayWebhookAsync
                              ↓
                          Order marked paid + tickets generated
```

## Related Code Files

### Create
```
backend/src/TicketStar.API/
└── Controllers/
    └── WebhooksController.cs

backend/src/TicketStar.Application/
├── DTOs/
│   └── Webhooks/
│       └── SePayWebhookDto.cs (SePay's payload format)
└── Services/
    └── GoogleTokenValidator.cs (extracted from AuthService)
```

### Modify
```
backend/src/TicketStar.Application/Services/AuthService.cs
  - Use GoogleTokenValidator instead of inline validation
```

## Implementation Steps

### 6.1 Create SePay Webhook DTO

#### SePayWebhookDto.cs
```csharp
namespace TicketStar.Application.DTOs.Webhooks;

public record SePayWebhookDto(
    string gateway,          // e.g., "MB_BANK", "VIETQR"
    string transactionId,    // SePay's transaction ID
    string content,          // Custom content (our order ref: "TS-{orderId}")
    decimal amount,          // Paid amount
    string code,             // Bank transaction code
    string accountNumber,    // Sender's account
    DateTime transferTime,   // When payment was made
    string? signature        // HMAC signature
);
```

### 6.2 Create ISePayWebhookHandler (Interface)

- **File**: `backend/src/TicketStar.Application/Interfaces/ISePayWebhookHandler.cs`
- **Methods**:
  ```csharp
  bool ValidateSignature(string payload, string signature);
  SePayWebhookDto? ParsePayload(string json);
  string? ExtractOrderReference(string content);
  ```

### 6.3 Implement SePayWebhookHandler

- **File**: `backend/src/TicketStar.Application/ExternalServices/SePayWebhookHandler.cs`
- **Dependencies**:
  - `IOptions<SePayOptions>` (secret key)
  - `ILogger<SePayWebhookHandler>`

- **ValidateSignature**:
  1. Compute HMAC-SHA256 of payload with secret
  2. Compare with provided signature
  3. Use constant-time comparison

- **ParsePayload**:
  1. Deserialize JSON to SePayWebhookDto
  2. Return null on deserialization error

- **ExtractOrderReference**:
  1. Parse content for pattern `TS-{Guid}`
  2. Extract Guid, return as string

### 6.4 Add SePay Options

- **File**: `backend/src/TicketStar.Application/Options/SePayOptions.cs`
```csharp
public class SePayOptions
{
    public const string SectionName = "SePay";
    public string SecretKey { get; set; } = null!;
    public string CallbackPath { get; set; } = "/api/webhooks/sepay";
}
```

### 6.5 Create WebhooksController

- **File**: `backend/src/TicketStar.API/Controllers/WebhooksController.cs`
- **Route**: `api/webhooks`
- **No authentication** (public endpoint for SePay)

#### POST /api/webhooks/sepay
```csharp
[HttpPost("sepay")]
[AllowAnonymous]
public async Task<IActionResult> SePayWebhook([FromBody] JsonElement payload)
{
    // 1. Extract signature from header or body
    var signature = Request.Headers["X-SePay-Signature"].FirstOrDefault();

    // 2. Validate signature
    var rawJson = payload.GetRawText();
    if (!_sePayHandler.ValidateSignature(rawJson, signature))
    {
        _logger.LogWarning("Invalid SePay webhook signature");
        return Unauthorized(new { error = "Invalid signature" });
    }

    // 3. Parse payload
    var dto = _sePayHandler.ParsePayload(rawJson);
    if (dto is null)
    {
        _logger.LogError("Failed to parse SePay webhook");
        return BadRequest(new { error = "Invalid payload" });
    }

    // 4. Process webhook
    var result = await _orderService.ProcessSePayWebhookAsync(rawJson, signature!);

    // 5. Always return 200 OK to stop SePay retries
    // (even if processing failed, log for manual reconcile)
    return result.IsSuccess
        ? Ok(new { message = "Webhook processed" })
        : Ok(new { message = "Webhook received", error = result.Error });
}
```

### 6.6 Extract Google Token Validator

- **File**: `backend/src/TicketStar.Application/Services/GoogleTokenValidator.cs`
- **Interface**: `IGoogleTokenValidator`
- **Methods**:
  ```csharp
  Task<Result<GoogleTokenPayload>> ValidateAsync(string idToken);
  ```

- **Implementation**: Extract logic from `AuthService.GoogleLoginAsync`
- **Payload DTO**:
  ```csharp
  public record GoogleTokenPayload(
      string Subject,
      string Email,
      string? Name,
      string? Picture,
      bool EmailVerified
  );
  ```

### 6.7 Update AuthService

- **File**: `backend/src/TicketStar.Application/Services/AuthService.cs`
- **Refactor**: Use `IGoogleTokenValidator` instead of inline `GoogleJsonWebSignature.ValidateAsync`

### 6.8 Register Services

- **File**: `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs`
- **Add to `AddApplicationServices()`**:
  ```csharp
  services.AddScoped<ISePayWebhookHandler, SePayWebhookHandler>();
  services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();
  ```
- **Add configuration**:
  ```csharp
  services.AddOptions<SePayOptions>()
      .BindConfiguration(SePayOptions.SectionName)
      .Validate(o => !string.IsNullOrEmpty(o.SecretKey), "SePay secret key required")
      .ValidateOnStart();
  ```

### 6.9 Add Configuration

- **File**: `backend/src/TicketStar.API/appsettings.json`
```json
{
  "SePay": {
    "SecretKey": "your-sepay-webhook-secret",
    "CallbackPath": "/api/webhooks/sepay"
  }
}
```

### 6.10 Add Health Check

- **File**: `backend/src/TicketStar.API/Program.cs`
- Add webhook health check:
```csharp
builder.Services.AddHealthChecks()
    .AddCheck("sepay-webhook", () =>
        HealthCheckResult.Healthy("SePay webhook endpoint configured"));
```

## Todo List

- [ ] Create SePayWebhookDto
- [ ] Create ISePayWebhookHandler interface
- [ ] Implement SePayWebhookHandler with signature validation
- [ ] Create SePayOptions class
- [ ] Create WebhooksController with SePay endpoint
- [ ] Extract IGoogleTokenValidator interface
- [ ] Implement GoogleTokenValidator service
- [ ] Refactor AuthService to use GoogleTokenValidator
- [ ] Register services in DI
- [ ] Add SePay configuration to appsettings
- [ ] Add webhook health check
- [ ] Test webhook signature validation
- [ ] Test order reference extraction

## Success Criteria

- [ ] Webhook endpoint accepts POST without auth
- [ ] Invalid signature returns 401
- [ ] Valid signature processes order
- [ ] Order reference extracted from content
- [ ] Always returns 200 OK (to stop SePay retries)
- [ ] Google token validator extracted successfully
- [ ] AuthService still works with extracted validator
- [ ] All webhook payloads logged
- [ ] Malformed JSON returns 400 but logs error

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Signature bypass | Critical | Constant-time comparison, never log secret |
| Webhook replay | High | Idempotency by externalRef in OrderService |
| SePay downtime | Medium | Log all webhooks for manual reconcile |
| Invalid orders paid | High | Validate amount matches order total |
| Webhook flood | Medium | Rate limit by IP (existing Redis limiter) |

## Security Considerations

- **Secret key**: Environment variable only, never commit
- **Signature validation**: Reject webhook without valid signature
- **Amount validation**: Always compare webhook amount vs order total
- **Error responses**: Generic messages, don't leak internal errors
- **Audit log**: Log all webhook payloads with timestamp
- **IP whitelist**: Consider restricting SePay IPs (if available)

## Next Steps

- **Phase 7**: Controllers for main API endpoints
- **Phase 8**: MassTransit consumers for notifications

## Unresolved Questions

1. SePay signature location (header vs body)? (Check docs - likely header)
2. SePay IP whitelist available? (Add to docs when known)
3. Webhook retry policy? (SePay typically retries 3x over 1 hour)
4. Should we store raw webhook payload? (Yes, for audit)
