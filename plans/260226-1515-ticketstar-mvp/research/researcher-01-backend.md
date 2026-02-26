# Backend Architecture Research — TicketStar MVP

Date: 2026-02-26 | Stack: .NET 8 + MySQL + Redis + RabbitMQ + JWT

---

## 1. Project Structure — Recommendation: Simple Layered

**Verdict: Simple layered (3-tier). No Clean Architecture overhead for MVP.**

```
TicketStar/
├── TicketStar.API/          # Controllers, Middleware, Program.cs
├── TicketStar.Application/  # Services, DTOs, Interfaces
├── TicketStar.Domain/       # Entities, Enums, Domain Events
└── TicketStar.Infrastructure/ # EF Core DbContext, Repos, Redis, RabbitMQ
```

- Skip CQRS/MediatR — adds indirection with no MVP benefit
- Skip Vertical Slices — good for large teams, overkill solo/small team
- EF Core over Dapper for MVP (migrations, less boilerplate). Use Dapper only for complex reporting queries if needed
- Repos pattern: thin generic `IRepository<T>` + specific ones (e.g. `IOrderRepository`)

---

## 2. Database Schema

### Core Tables

```sql
-- Users managed by ASP.NET Identity (AspNetUsers, AspNetRoles, AspNetUserRoles)
-- Add custom columns via migration:
ALTER TABLE AspNetUsers ADD COLUMN OrganizerId INT NULL;

CREATE TABLE Events (
  Id INT PK AUTO_INCREMENT,
  OrganizerId VARCHAR(450) NOT NULL,  -- FK AspNetUsers.Id
  Title VARCHAR(255), Description TEXT,
  StartAt DATETIME, EndAt DATETIME,
  Venue VARCHAR(500),
  Status ENUM('Draft','Published','Cancelled') DEFAULT 'Draft',
  CreatedAt DATETIME DEFAULT NOW(),
  INDEX idx_organizer (OrganizerId),
  INDEX idx_status_start (Status, StartAt)
);

CREATE TABLE TicketTypes (
  Id INT PK AUTO_INCREMENT,
  EventId INT NOT NULL FK Events(Id),
  Name VARCHAR(100),          -- e.g. "VIP", "General"
  Price DECIMAL(10,2),
  Quota INT NOT NULL,         -- total available
  SoldCount INT DEFAULT 0,    -- atomic via Redis lock
  SaleStartAt DATETIME, SaleEndAt DATETIME,
  INDEX idx_event (EventId)
);

CREATE TABLE Orders (
  Id INT PK AUTO_INCREMENT,
  UserId VARCHAR(450) NOT NULL FK AspNetUsers(Id),
  Status ENUM('Pending','Paid','Cancelled','Expired') DEFAULT 'Pending',
  TotalAmount DECIMAL(10,2),
  ExpiresAt DATETIME NOT NULL,  -- Pending expires in 15min
  CreatedAt DATETIME DEFAULT NOW(),
  PaidAt DATETIME NULL,
  INDEX idx_user (UserId),
  INDEX idx_status_expires (Status, ExpiresAt)
);

CREATE TABLE OrderItems (
  Id INT PK AUTO_INCREMENT,
  OrderId INT NOT NULL FK Orders(Id),
  TicketTypeId INT NOT NULL FK TicketTypes(Id),
  Quantity INT NOT NULL,
  UnitPrice DECIMAL(10,2)
);

CREATE TABLE Tickets (
  Id INT PK AUTO_INCREMENT,
  OrderItemId INT NOT NULL FK OrderItems(Id),
  UserId VARCHAR(450) NOT NULL,
  EventId INT NOT NULL,
  TicketTypeId INT NOT NULL,
  QrCode VARCHAR(500) UNIQUE,   -- signed JWT or UUID stored
  QrData TEXT,                  -- full encoded string for display
  IsCheckedIn TINYINT DEFAULT 0,
  CreatedAt DATETIME DEFAULT NOW(),
  UNIQUE INDEX idx_qr (QrCode),
  INDEX idx_event_user (EventId, UserId)
);

CREATE TABLE CheckIns (
  Id INT PK AUTO_INCREMENT,
  TicketId INT NOT NULL FK Tickets(Id),
  ScannedBy VARCHAR(450) NOT NULL FK AspNetUsers(Id),  -- Staff
  ScannedAt DATETIME DEFAULT NOW(),
  EventId INT NOT NULL
);

CREATE TABLE Payments (
  Id INT PK AUTO_INCREMENT,
  OrderId INT NOT NULL UNIQUE FK Orders(Id),
  Provider VARCHAR(50) DEFAULT 'mock',
  ExternalRef VARCHAR(255),
  Amount DECIMAL(10,2),
  Status ENUM('Pending','Success','Failed') DEFAULT 'Pending',
  ProcessedAt DATETIME NULL
);
```

**Indexes priority:** `Orders(Status, ExpiresAt)` for expiry job; `Tickets(QrCode)` for scan lookups; `TicketTypes(EventId)` for listing.

---

## 3. Redis Distributed Lock — Ticket Quota Enforcement

**Pattern: SET NX PX (RedLock-lite via StackExchange.Redis)**

```csharp
// NuGet: StackExchange.Redis
public class TicketLockService(IConnectionMultiplexer redis)
{
    private readonly IDatabase _db = redis.GetDatabase();

    public async Task<bool> TryReserveTicketsAsync(
        int ticketTypeId, int quantity, int quotaAvailable, int soldCount)
    {
        var lockKey = $"lock:tickettype:{ticketTypeId}";
        var lockValue = Guid.NewGuid().ToString();
        var lockAcquired = await _db.StringSetAsync(
            lockKey, lockValue, TimeSpan.FromSeconds(10), When.NotExists);

        if (!lockAcquired) return false; // retry or queue

        try
        {
            // Re-read SoldCount from DB inside lock for accuracy
            var remaining = quotaAvailable - soldCount;
            if (remaining < quantity) return false;

            // Increment atomically with Lua script or pipeline
            await _db.StringIncrementAsync($"sold:{ticketTypeId}", quantity);
            return true;
        }
        finally
        {
            // Release only if we own the lock
            var script = @"if redis.call('get',KEYS[1])==ARGV[1] then
                           return redis.call('del',KEYS[1]) else return 0 end";
            await _db.ScriptEvaluateAsync(script,
                new RedisKey[] { lockKey }, new RedisValue[] { lockValue });
        }
    }
}
```

**Flow:** acquire lock → re-read DB quota → check → increment Redis counter → commit DB `SoldCount` update → release lock. Persist `SoldCount` to DB after confirmed payment, not reservation (use Redis counter as fast-path guard).

---

## 4. RabbitMQ Integration

**Verdict: MassTransit over raw client.** Handles retries, dead-letter, consumer registration, and integrates cleanly with .NET DI. Raw client = too much boilerplate.

```csharp
// Program.cs
builder.Services.AddMassTransit(x => {
    x.AddConsumer<SendOrderConfirmationEmailConsumer>();
    x.UsingRabbitMq((ctx, cfg) => {
        cfg.Host("rabbitmq://localhost", h => {
            h.Username("guest"); h.Password("guest");
        });
        cfg.ConfigureEndpoints(ctx);
    });
});

// Message
public record OrderConfirmationEmail(string To, string OrderId, string EventName);

// Producer (in OrderService)
await _publishEndpoint.Publish(new OrderConfirmationEmail(user.Email, order.Id.ToString(), eventName));

// Consumer (stub)
public class SendOrderConfirmationEmailConsumer : IConsumer<OrderConfirmationEmail>
{
    public Task Consume(ConsumeContext<OrderConfirmationEmail> ctx)
    {
        // Stub: log to console, swap for real SMTP later
        Console.WriteLine($"[EMAIL STUB] To: {ctx.Message.To} Order: {ctx.Message.OrderId}");
        return Task.CompletedTask;
    }
}
```

---

## 5. QR Code Generation

**Library: QRCoder** (NuGet: `QRCoder`) — pure .NET, no native deps. For image rendering use `QRCoder` + `PngByteQRCode` or embed base64 in response.

**What to encode:** Signed JWT mini-token (not UUID alone — UUIDs are guessable/forgeable if DB not checked):

```csharp
// Encode: compact JSON signed with HMAC-SHA256
var payload = $"{ticketId}:{eventId}:{userId}";
var signature = HMAC_SHA256(payload, secretKey);
var qrData = $"{payload}:{signature}";  // encode this string into QR

// Verify on scan:
// 1. Split, re-compute HMAC, compare — O(1) without DB hit
// 2. Then DB lookup for IsCheckedIn flag
```

**Generation:**

```csharp
using QRCoder;
var qrGenerator = new QRCodeGenerator();
var qrCodeData = qrGenerator.CreateQrCode(qrData, QRCodeGenerator.ECCLevel.M);
var png = new PngByteQRCode(qrCodeData);
var bytes = png.GetGraphic(20);  // 20px per module
```

Store `qrData` string in `Tickets.QrData`; store a hash of it in `Tickets.QrCode` for lookup index.

---

## 6. Order Flow — State Machine

```
[POST /orders] → Status: Pending, ExpiresAt = NOW()+15min
     ↓
[POST /orders/{id}/pay (mock)] → Status: Paid, generate Tickets, publish email event
     ↓ (alternative paths)
[User cancel] → Status: Cancelled, release Redis counter
[Background job] → Pending orders past ExpiresAt → Status: Expired, release Redis counter
```

**Order Expiry — Background Service:**

```csharp
public class OrderExpiryService(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var expired = await db.Orders
                .Where(o => o.Status == OrderStatus.Pending && o.ExpiresAt < DateTime.UtcNow)
                .ToListAsync(ct);
            foreach (var order in expired)
            {
                order.Status = OrderStatus.Expired;
                // TODO: release Redis sold counters for each order item
            }
            await db.SaveChangesAsync(ct);
            await Task.Delay(TimeSpan.FromMinutes(1), ct);
        }
    }
}
```

Register: `builder.Services.AddHostedService<OrderExpiryService>();`

---

## Key NuGet Packages

| Purpose  | Package                                                                        |
| -------- | ------------------------------------------------------------------------------ |
| ORM      | `Microsoft.EntityFrameworkCore.Relational`, `Pomelo.EntityFrameworkCore.MySql` |
| Identity | `Microsoft.AspNetCore.Identity.EntityFrameworkCore`                            |
| JWT      | `Microsoft.AspNetCore.Authentication.JwtBearer`                                |
| Redis    | `StackExchange.Redis`                                                          |
| RabbitMQ | `MassTransit.RabbitMQ`                                                         |
| QR Code  | `QRCoder`                                                                      |

---

## Resolved Decisions — 2026-02-26

| Question | Decision |
|---|---|
| Payment webhook | **Real SePay via ngrok tunnel** — actual QR + bank transfer in dev |
| SoldCount timing | **On payment confirmation only** — Redis counter guards reservation; rolled back on cancel/expiry |
| Staff assignment | **Per-event StaffAssignments table** — staff can only scan assigned events |
| QR delivery | **Return `qrData` string** — frontend renders SVG via `react-qr-code` |
