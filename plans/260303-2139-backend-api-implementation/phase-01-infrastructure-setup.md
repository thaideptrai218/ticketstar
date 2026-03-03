# Phase 1: Infrastructure Setup

## Context
- Parent Plan: [plan.md](plan.md)
- Roadmap: [../../docs/development-roadmap.md](../../docs/development-roadmap.md)
- Related: [phase-02-domain-repositories.md](phase-02-domain-repositories.md)

## Overview
**Priority**: P0 (Blocking)
**Status**: Pending
**Effort**: 1.5 hours

Set up foundational infrastructure components: QR code generation library, distributed locking primitives, MassTransit integration, and basic cache service extensions.

## Key Insights

- Domain entities already exist (Event, Ticket, Order, CheckIn, TicketType)
- Redis already integrated via `IRedisService` - extend with distributed lock
- MassTransit not yet configured - needs setup in Program.cs
- QR code format: `ticketId|eventId|userId|timestamp` + HMAC-SHA256
- Need NetTopologySuite for geospatial queries (defer to v2 - use simple venue string for MVP)

## Requirements

### Functional
1. QR code generation with HMAC signing
2. Distributed Redis lock for ticket quota
3. MassTransit bus setup for RabbitMQ
4. Cache key management utilities
5. SePay webhook security (signature validation)

### Non-Functional
- Fail-open for Redis operations (graceful degradation)
- Idempotent message consumers
- Thread-safe distributed locks
- QR code tamper-evident (HMAC verification)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                  │
├─────────────────────────────────────────────────────────┤
│  QrCodeService          │  RedisDistributedLock         │
│  - Generate(data)        │  - AcquireAsync(key)          │
│  - Validate(qr, hmac)    │  - ReleaseAsync(key)          │
├─────────────────────────┴───────────────────────────────┤
│  MassTransit Setup      │  CacheKeyHelpers              │
│  - IBus control          │  - EventListKey              │
│  - Publish<T>()          │  - TicketQuotaKey            │
│  - Consumer registration │  - EventDetailKey            │
├─────────────────────────────────────────────────────────┤
│  SePayWebhookHandler    │  Extensions                   │
│  - ValidateSignature()   │  - AddMassTransit()          │
│  - ParsePayload()        │  - AddQrService()            │
└─────────────────────────────────────────────────────────┘
```

## Related Code Files

### Create
```
backend/src/TicketStar.Application/
├── Services/
│   ├── QrCodeService.cs
│   └── RedisDistributedLock.cs
├── Interfaces/
│   ├── IQrCodeService.cs
│   ├── IDistributedLock.cs
│   └── IBusProvider.cs (wrapper for MassTransit)
├── Security/
│   └── QrSecurityService.cs (HMAC)
├── Common/
│   └── CacheKeys.cs (static constants)
├── Options/
│   └── QrOptions.cs
└── ExternalServices/
    ├── SePayWebhookHandler.cs
    └── SePaySignatureValidator.cs

backend/src/TicketStar.API/Extensions/
└── MassTransitExtensions.cs
```

### Modify
```
backend/src/TicketStar.API/Program.cs
backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs
backend/src/TicketStar.Application/TicketStar.Application.csproj
```

## Implementation Steps

### 1.1 Add NuGet Packages
```bash
cd backend/src/TicketStar.Application
dotnet add package QRCoder
dotnet add package MassTransit.RabbitMQ
dotnet add package MassTransit.AspNetCore
```

### 1.2 Create QR Code Service
- **File**: `backend/src/TicketStar.Application/Services/QrCodeService.cs`
- **Purpose**: Generate QR codes with HMAC-SHA256 signature
- **Interface**: `IQrCodeService`
- **Methods**:
  - `string GenerateQrCode(string content)` - returns base64 PNG
  - `string GenerateTicketPayload(Guid ticketId, Guid eventId, string userId)`
  - `string GenerateHmac(string payload)`
  - `bool VerifyQrCode(string qrData, string signature)`
  - `TicketQrData ParseTicketQr(string qrData)`

### 1.3 Create Distributed Lock Service
- **File**: `backend/src/TicketStar.Application/Services/RedisDistributedLock.cs`
- **Interface**: `IDistributedLock`
- **Methods**:
  - `Task<IDistributedLock?> AcquireAsync(string key, TimeSpan ttl, CancellationToken ct)`
  - `Task ReleaseAsync(string lockKey)`
- **Implementation**: Use `SET key value NX EX ttl` pattern
- **Fail-open**: Return null on Redis failure (caller must handle)

### 1.4 Setup MassTransit
- **File**: `backend/src/TicketStar.API/Extensions/MassTransitExtensions.cs`
- **Extension method**: `AddMassTransitWithRabbitMQ(this IServiceCollection services, IConfiguration config)`
- **Configuration**: RabbitMQ connection from appsettings
- **Consumer registration**: Empty initially (Phase 8)
- **Publisher**: Register `IBus` as singleton

### 1.5 Create SePay Webhook Handler
- **File**: `backend/src/TicketStar.Application/ExternalServices/SePayWebhookHandler.cs`
- **Purpose**: Validate webhook signature + parse payload
- **Interface**: `ISePayWebhookHandler`
- **Methods**:
  - `bool ValidateSignature(string payload, string signature, string secret)`
  - `SePayWebhookPayload? ParsePayload(string json)`
  - `string ExtractOrderReference(string content)`
- **Security**: HMAC-SHA256 signature validation

### 1.6 Create Cache Keys Helper
- **File**: `backend/src/TicketStar.Application/Common/CacheKeys.cs`
- **Static class** with constant strings
- **Patterns**:
  - `event:list:{page}:{pageSize}`
  - `event:detail:{slug}`
  - `ticket:quota:{ticketTypeId}:lock`
  - `event:stats:{eventId}`

### 1.7 Register Services
- **File**: `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs`
- **Update**: `AddApplicationServices()`
- **Add registrations**:
  - `AddSingleton<IQrCodeService, QrCodeService>()`
  - `AddScoped<IDistributedLock, RedisDistributedLock>()`
  - `AddSingleton<IBus, IBus>(sp => sp.GetRequiredService<IBusControl>())`

### 1.8 Update Program.cs
- Add `AddMassTransitWithRabbitMQ()` before `builder.Build()`
- Configure MassTransit to use existing RabbitMQ container
- Add MassTransit health check

## Todo List

- [ ] Add QRCoder and MassTransit NuGet packages
- [ ] Create `IQrCodeService` interface with ticket payload methods
- [ ] Implement `QrCodeService` with HMAC signing
- [ ] Create `IDistributedLock` interface for Redis locks
- [ ] Implement `RedisDistributedLock` with SET NX pattern
- [ ] Create `ISePayWebhookHandler` interface
- [ ] Implement `SePaySignatureValidator` for webhook security
- [ ] Create `CacheKeys` static class
- [ ] Create `AddMassTransitWithRabbitMQ()` extension
- [ ] Update `AddApplicationServices()` with new registrations
- [ ] Update `Program.cs` to configure MassTransit
- [ ] Add `QrOptions` configuration class
- [ ] Add MassTransit configuration to appsettings.json

## Success Criteria

- [ ] QR code generates base64 PNG string
- [ ] HMAC signature validates tampered QR codes
- [ ] Distributed lock acquires/releases Redis key
- [ ] MassTransit connects to RabbitMQ (health check passes)
- [ ] SePay signature validation detects tampering
- [ ] All services compile without errors
- [ ] `dotnet build` succeeds

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Redis down → locks fail | Medium | Fail-open, log warnings, fallback to DB optimistic concurrency |
| RabbitMQ down → messages lost | Medium | MassTransit retry policy, in-memory fallback for MVP |
| QR library incompatible | Low | QRCoder is .NET 8 compatible |
| SePay signature format changes | Low | Abstract handler, configurable secret |

## Security Considerations

- **HMAC Secret**: 256-bit random key in appsettings (env var)
- **QR Code Format**: Include timestamp to prevent replay
- **SePay Webhook**: Always validate signature before processing
- **Lock Key Scope**: Include ticketTypeId to avoid deadlocks
- **Fail-Open Logging**: All Redis failures logged at Warning level

## Next Steps

- **Phase 2**: Domain repositories (Event, TicketType, Order, CheckIn)
- **Phase 3**: EventService with cache integration
- **Dependencies**: None - this is infrastructure foundation

## Unresolved Questions

1. Should QR codes include expiry timestamp? (Recommended: yes, event start time + 24h)
2. MassTransit consumer error handling strategy? (Retry 3x → deadletter)
3. SePay sandbox environment for testing? (Need credentials from docs)
