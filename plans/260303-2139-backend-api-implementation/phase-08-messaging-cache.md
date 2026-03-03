# Phase 8: Messaging & Cache

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-01-infrastructure-setup.md](phase-01-infrastructure-setup.md)

## Overview
**Priority**: P2 (Notifications)
**Status**: Pending
**Effort**: 1 hour

Implement MassTransit message contracts and consumers for order confirmation and check-in notifications. Set up hosted service for order expiration cleanup. Configure cache invalidation strategy.

## Key Insights

- MassTransit already configured in Phase 1
- Need message contracts (interfaces)
- Console-log consumers for MVP (no real email)
- Cache invalidation on mutations
- Background cleanup for expired orders

## Requirements

### Functional
1. Message contracts for OrderConfirmed, TicketCheckedIn
2. Console-log consumers (email stub)
3. Cache invalidation service
4. Hosted service for order expiration
5. Publish messages from services

### Non-Functional
- Messages survive restarts (RabbitMQ persistence)
- Consumers handle errors gracefully
- Cache TTL configured appropriately
- Background service doesn't block shutdown

## Architecture

```
Service → Publish(message) → RabbitMQ → Consumer → Console log (email stub)
                                    ↓
                              Dead letter queue (errors)
```

## Related Code Files

### Create
```
backend/src/TicketStar.Application/
├── Messages/
│   ├── Contracts/
│   │   ├── IOrderConfirmed.cs
│   │   ├── ITicketCheckedIn.cs
│   │   └── IEventPublished.cs
│   └── Consumers/
│       ├── OrderConfirmedConsumer.cs (console log)
│       ├── TicketCheckedInConsumer.cs (console log)
│       └── EventPublishedConsumer.cs (console log)
├── Services/
│   ├── CacheInvalidationService.cs
│   └── OrderExpirationService.cs (BackgroundService)
└── Interfaces/
    ├── ICacheInvalidationService.cs
    └── IMessagePublisher.cs (wrapper for IBus)
```

### Modify
```
backend/src/TicketStar.API/Extensions/MassTransitExtensions.cs
backend/src/TicketStar.API/Program.cs
```

## Implementation Steps

### 8.1 Define Message Contracts

#### IOrderConfirmed.cs
```csharp
namespace TicketStar.Application.Messages.Contracts;

public interface IOrderConfirmed
{
    Guid OrderId { get; }
    string UserEmail { get; }
    string UserName { get; }
    decimal TotalAmount { get; }
    DateTime PaidAt { get; }
    List<TicketInfo> Tickets { get; }
}

public record TicketInfo(
    Guid TicketId,
    string TicketTypeName,
    string EventTitle,
    DateTime EventStartAt
);
```

#### ITicketCheckedIn.cs
```csharp
namespace TicketStar.Application.Messages.Contracts;

public interface ITicketCheckedIn
{
    Guid TicketId { get; }
    Guid EventId { get; }
    string AttendeeEmail { get; }
    string AttendeeName { get; }
    DateTime CheckedInAt { get; }
    string EventTitle { get; }
}
```

#### IEventPublished.cs
```csharp
namespace TicketStar.Application.Messages.Contracts;

public interface IEventPublished
{
    Guid EventId { get; }
    string EventTitle { get; }
    string OrganizerEmail { get; }
    DateTime PublishedAt { get; }
    int TicketTypeCount { get; }
}
```

### 8.2 Create IMessagePublisher Wrapper

- **File**: `backend/src/TicketStar.Application/Interfaces/IMessagePublisher.cs`
- **Purpose**: Abstract MassTransit IBus for easier testing
- **Methods**:
  ```csharp
  Task PublishAsync<T>(T message, CancellationToken ct = default) where T : class;
  ```

- **Implementation**: `MessagePublisher` - wrapper around `IBus`

### 8.3 Implement Cache Invalidation Service

- **File**: `backend/src/TicketStar.Application/Services/CacheInvalidationService.cs`
- **Interface**: `ICacheInvalidationService`
- **Dependencies**: `IRedisService`

- **Methods**:
  ```csharp
  Task InvalidateEventAsync(Guid eventId);
  Task InvalidateEventListAsync();
  Task InvalidateEventDetailAsync(string slug);
  Task InvalidateByPatternAsync(string pattern); // Use KEYS + DEL (dev only)
  ```

- **Implementation**:
  - Use `CacheKeys` constants
  - Redis `DEL` command for exact keys
  - For pattern: Scan for keys (production: don't use KEYS)

### 8.4 Implement Order Expiration Service

- **File**: `backend/src/TicketStar.Application/Services/OrderExpirationService.cs`
- **Base**: `BackgroundService`
- **Dependencies**: `IOrderService`, `ILogger<OrderExpirationService>`

- **Configuration**:
  - Run every 5 minutes
  - Check for orders expired > 15 minutes

- **ExecuteAsync**:
  ```csharp
  protected override async Task ExecuteAsync(CancellationToken ct)
  {
      while (!ct.IsCancellationRequested)
      {
          try
          {
              await _orderService.CleanupExpiredOrdersAsync(ct);
              await Task.Delay(TimeSpan.FromMinutes(5), ct);
          }
          catch (Exception ex)
          {
              _logger.LogError(ex, "Order expiration cleanup failed");
          }
      }
  }
  ```

### 8.5 Create Consumers

#### OrderConfirmedConsumer.cs
```csharp
namespace TicketStar.Application.Messages.Consumers;

public class OrderConfirmedConsumer : IConsumer<IOrderConfirmed>
{
    private readonly ILogger<OrderConfirmedConsumer> _logger;

    public OrderConfirmedConsumer(ILogger<OrderConfirmedConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<IOrderConfirmed> context)
    {
        var msg = context.Message;
        _logger.LogInformation("""
            [EMAIL STUB] Order Confirmation
            To: {Email}
            Order ID: {OrderId}
            Amount: {Amount}
            Tickets: {TicketCount}
            """,
            msg.UserEmail, msg.OrderId, msg.TotalAmount, msg.Tickets.Count);

        // TODO: Real email integration (Phase 10)
        await Task.CompletedTask;
    }
}
```

#### TicketCheckedInConsumer.cs
```csharp
public class TicketCheckedInConsumer : IConsumer<ITicketCheckedIn>
{
    private readonly ILogger<TicketCheckedInConsumer> _logger;

    public TicketCheckedInConsumer(ILogger<TicketCheckedInConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ITicketCheckedIn> context)
    {
        var msg = context.Message;
        _logger.LogInformation("""
            [EMAIL STUB] Check-In Notification
            To: {Email}
            Event: {Event}
            Checked in at: {Time}
            """,
            msg.AttendeeEmail, msg.EventTitle, msg.CheckedInAt);

        await Task.CompletedTask;
    }
}
```

#### EventPublishedConsumer.cs
```csharp
public class EventPublishedConsumer : IConsumer<IEventPublished>
{
    private readonly ILogger<EventPublishedConsumer> _logger;

    public EventPublishedConsumer(ILogger<EventPublishedConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<IEventPublished> context)
    {
        var msg = context.Message;
        _logger.LogInformation("""
            [EMAIL STUB] Event Published
            To: {Email}
            Event: {Title}
            Ticket types: {Count}
            """,
            msg.OrganizerEmail, msg.EventTitle, msg.TicketTypeCount);

        await Task.CompletedTask;
    }
}
```

### 8.6 Register Consumers

- **File**: `backend/src/TicketStar.API/Extensions/MassTransitExtensions.cs`
- **Update**: `AddMassTransitWithRabbitMQ()`
- **Add consumer registration**:
  ```csharp
  cfg.AddConsumer<OrderConfirmedConsumer>();
  cfg.AddConsumer<TicketCheckedInConsumer>();
  cfg.AddConsumer<EventPublishedConsumer>();

  cfg.UsingRabbitMq((context, cfg) =>
  {
      cfg.ReceiveEndpoint("order-confirmed", e =>
      {
          e.ConfigureConsumer<OrderConfirmedConsumer>(context);
      });
      cfg.ReceiveEndpoint("ticket-checked-in", e =>
      {
          e.ConfigureConsumer<TicketCheckedInConsumer>(context);
      });
      cfg.ReceiveEndpoint("event-published", e =>
      {
          e.ConfigureConsumer<EventPublishedConsumer>(context);
      });
      // ... rest of config
  });
  ```

### 8.7 Register Services

- **File**: `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs`
- **Add to `AddApplicationServices()`**:
  ```csharp
  services.AddSingleton<IMessagePublisher, MessagePublisher>();
  services.AddScoped<ICacheInvalidationService, CacheInvalidationService>();
  services.AddHostedService<OrderExpirationService>();
  ```

### 8.8 Update Services to Publish Messages

- **EventService.PublishAsync**: Publish `IEventPublished`
- **OrderService.ProcessSePayWebhookAsync**: Publish `IOrderConfirmed`
- **CheckInService.ScanQrCodeAsync**: Publish `ITicketCheckedIn`

### 8.9 Configure RabbitMQ

- **File**: `backend/src/TicketStar.API/appsettings.json`
```json
{
  "MassTransit": {
    "Host": "localhost",
    "Port": 5672,
    "VirtualHost": "/",
    "Username": "guest",
    "Password": "guest"
  }
}
```

## Todo List

- [ ] Create message contracts (IOrderConfirmed, ITicketCheckedIn, IEventPublished)
- [ ] Create IMessagePublisher interface and implementation
- [ ] Create ICacheInvalidationService interface
- [ ] Implement CacheInvalidationService
- [ ] Create OrderExpirationService (BackgroundService)
- [ ] Create OrderConfirmedConsumer (console log)
- [ ] Create TicketCheckedInConsumer (console log)
- [ ] Create EventPublishedConsumer (console log)
- [ ] Register consumers in MassTransit config
- [ ] Register services in DI
- [ ] Update EventService to publish IEventPublished
- [ ] Update OrderService to publish IOrderConfirmed
- [ ] Update CheckInService to publish ITicketCheckedIn
- [ ] Add cache invalidation calls to mutation methods
- [ ] Add RabbitMQ configuration
- [ ] Test message publishing and consuming

## Success Criteria

- [ ] Order confirmed message published to RabbitMQ
- [ ] Check-in message published to RabbitMQ
- [ ] Event published message published to RabbitMQ
- [ ] Console consumers log message content
- [ ] Cache invalidation removes stale data
- [ ] Order expiration service runs periodically
- [ ] Background service starts with app
- [ ] Messages survive restart (RabbitMQ persistence)
- [ ] Error messages go to dead letter queue

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| RabbitMQ down → messages lost | Medium | Persistent queues, publisher confirms |
| Consumer throws → retry loop | Medium | Retry 3x → dead letter |
| Background service crashes | Low | Exception handling + logging |
| Cache invalidation fails | Low | Log warning, data self-heals on TTL |

## Security Considerations

- **Message content**: No sensitive data in message bodies
- **Queue access**: RabbitMQ authentication required
- **Consumer auth**: Consumers run server-side, no external access
- **Email content**: Don't log full payment details

## Next Steps

- **Testing**: Integration tests for message flow
- **Phase 9**: Frontend integration with API

## Unresolved Questions

1. Should we use message encryption? (Not needed for MVP, RabbitMQ on localhost)
2. Consumer retry policy? (3 retries with exponential backoff)
3. Dead letter queue processing? (Manual admin intervention for MVP)
4. Email service integration? (Deferred to Phase 10, use console stub)
