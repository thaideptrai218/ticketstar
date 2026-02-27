# Backend API Design Patterns — TicketStar

Production-ready patterns for ASP.NET 8 Clean Architecture. All examples use TicketStar codebase context.

---

## Adoption Roadmap

```
NOW (before more features):
├── 1. Result Pattern           ← stop throwing exceptions for business logic
├── 2. API Response Envelope    ← consistent JSON shape
├── 3. Global Exception MW      ← safety net for unexpected errors
├── 4. Options Pattern           ← typed config, fail-fast on startup
├── 5. Health Checks             ← required for any deployment
├── 7. DI Extension Methods      ← clean Program.cs
├── 8. Problem Details           ← standard error format
├── 10. HTTP Status Codes        ← correct 201/204/422
└── 15. Correlation IDs          ← debuggable logs

EVENTS/ORDERS PHASE:
├── 6. API Versioning            ← before you have clients consuming your API
├── 9. Pagination               ← any list endpoint
├── 11. FluentValidation         ← complex validation rules
└── 12. Repository + UoW         ← when multiple services share entities

PAYMENTS PHASE:
├── 16. Circuit Breaker          ← external payment gateway calls
├── 17. Idempotency Keys         ← prevent double charges
└── 18. Outbox Pattern           ← order + email + inventory atomicity

SCALE PHASE:
├── 13. MediatR/CQRS             ← when services exceed 200 lines
├── 14. Domain Events            ← decouple side effects from core logic
├── 19. Vertical Slices          ← when 10+ endpoints or 3+ devs
└── 20. Minimal APIs             ← simple CRUD alongside controllers
```

---

## 1. Result Pattern

**Problem:** Using exceptions for expected business outcomes (wrong password, duplicate email) is expensive (~1000x cost of an `if` check), forces try/catch boilerplate in every controller, and conflates "something broke" with "business rule rejected."

**Solution:** Return success/failure as a value:

```csharp
// TicketStar.Application/Common/Result.cs
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public int StatusCode { get; }

    private Result(T value) { IsSuccess = true; Value = value; StatusCode = 200; }
    private Result(string error, int statusCode) { IsSuccess = false; Error = error; StatusCode = statusCode; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error, int statusCode = 400) => new(error, statusCode);
}

// Void version for operations that don't return data
public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public int StatusCode { get; }

    private Result() { IsSuccess = true; StatusCode = 200; }
    private Result(string error, int statusCode) { IsSuccess = false; Error = error; StatusCode = statusCode; }

    public static Result Success() => new();
    public static Result Failure(string error, int statusCode = 400) => new(error, statusCode);
}
```

**Before (current):**
```csharp
// Service throws
if (user is null) throw new UnauthorizedAccessException("Invalid credentials.");

// Controller catches
try { var response = await _authService.LoginAsync(...); return Ok(response); }
catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }
```

**After:**
```csharp
// Service returns Result
if (user is null) return Result<TokenResponse>.Failure("Invalid credentials.", 401);

// Controller inspects Result (no try/catch)
var result = await _authService.LoginAsync(request, GetIp(), GetUserAgent());
return result.IsSuccess ? Ok(result.Value) : StatusCode(result.StatusCode, new { error = result.Error });
```

---

## 2. API Response Envelope

**Problem:** Different endpoints return different JSON shapes — frontend must handle each one differently.

**Solution:** Every response follows the same structure:

```csharp
// TicketStar.Application/Common/ApiResponse.cs
public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public string? TraceId { get; init; }

    public static ApiResponse<T> Ok(T data, string? traceId = null)
        => new() { Success = true, Data = data, TraceId = traceId };

    public static ApiResponse<T> Fail(string error, string? traceId = null)
        => new() { Success = false, Error = error, TraceId = traceId };
}

public class ApiResponse
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public string? Error { get; init; }
    public string? TraceId { get; init; }

    public static ApiResponse Ok(string? message = null, string? traceId = null)
        => new() { Success = true, Message = message, TraceId = traceId };

    public static ApiResponse Fail(string error, string? traceId = null)
        => new() { Success = false, Error = error, TraceId = traceId };
}
```

**Base controller integrates Result + Envelope:**
```csharp
// TicketStar.API/Controllers/ApiControllerBase.cs
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult FromResult<T>(Result<T> result)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? Ok(ApiResponse<T>.Ok(result.Value!, traceId))
            : StatusCode(result.StatusCode, ApiResponse<T>.Fail(result.Error!, traceId));
    }

    protected IActionResult FromResult(Result result, string? successMessage = null)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? Ok(ApiResponse.Ok(successMessage, traceId))
            : StatusCode(result.StatusCode, ApiResponse.Fail(result.Error!, traceId));
    }

    protected IActionResult CreatedFromResult<T>(Result<T> result, string actionName, object? routeValues)
    {
        var traceId = HttpContext.TraceIdentifier;
        return result.IsSuccess
            ? CreatedAtAction(actionName, routeValues, ApiResponse<T>.Ok(result.Value!, traceId))
            : StatusCode(result.StatusCode, ApiResponse<T>.Fail(result.Error!, traceId));
    }
}
```

**Controllers become one-liners:**
```csharp
[HttpPost("login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
    => FromResult(await _authService.LoginAsync(request, GetIp(), GetUserAgent()));

[Authorize]
[HttpPost("logout")]
public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    => FromResult(await _authService.LogoutAsync(request.RefreshToken), "Logged out successfully.");
```

**Frontend — one handler for all endpoints:**
```typescript
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!body.success) throw new ApiError(body.error, res.status, body.traceId);
  return body.data as T;
}
```

---

## 3. Global Exception Middleware

**Problem:** Even with Result pattern, truly unexpected errors (DB timeout, null ref, network failure) need a safety net. Without it, unhandled exceptions leak stack traces or return empty 500 responses.

**Solution:** Middleware wrapping entire pipeline:

```csharp
// TicketStar.API/Middleware/GlobalExceptionMiddleware.cs
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path} from {IP}",
                context.Request.Method, context.Request.Path, context.Connection.RemoteIpAddress);

            // NEVER expose stack traces, SQL, connection strings, or class names
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                error = "An internal error occurred. Please try again later.",
                traceId = context.TraceIdentifier
            });
        }
    }
}

// Program.cs — register FIRST (wraps everything)
app.UseMiddleware<GlobalExceptionMiddleware>();
```

| Scenario | Result Pattern Handles? | Global MW Handles? |
|----------|:-----------------------:|:------------------:|
| Wrong password | Yes | No |
| Duplicate email | Yes | No |
| DB connection timeout | No | Yes |
| NullReferenceException | No | Yes |
| Google API network error | No | Yes |
| JSON deserialization fail | No | Yes |

---

## 4. Options Pattern

**Problem:** `_config["Jwt:Secret"]` — no compile-time safety, no IntelliSense, no startup validation, magic strings scattered across files.

**Solution:** Strongly-typed configuration classes:

```csharp
// TicketStar.Application/Options/JwtOptions.cs
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; init; } = "";
    public string Issuer { get; init; } = "";
    public string Audience { get; init; } = "";
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 7;
}

public class GoogleAuthOptions
{
    public const string SectionName = "Google";
    public string ClientId { get; init; } = "";
    public string ClientSecret { get; init; } = "";
}
```

**Registration with startup validation:**
```csharp
// Program.cs
builder.Services.AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .Validate(o => o.Secret.Length >= 32, "JWT secret must be at least 32 characters")
    .Validate(o => !string.IsNullOrEmpty(o.Issuer), "JWT issuer is required")
    .ValidateOnStart();  // ← app won't start if validation fails
```

**Usage — inject IOptions<T>:**
```csharp
// Before: _config["Jwt:Secret"]!  ← string, nullable, no compile check
// After:  _jwtOptions.Secret       ← typed, IntelliSense, compile-time safe
public class TokenService(IOptions<JwtOptions> jwtOptions, ...) { ... }
```

| Injection Type | When | Behavior |
|----------------|------|----------|
| `IOptions<T>` | Most services | Read once, cached |
| `IOptionsSnapshot<T>` | Per-request config | Re-reads per request (scoped) |
| `IOptionsMonitor<T>` | Background services | Notifies on change (singleton-safe) |

---

## 5. Health Checks

**Problem:** Load balancers need to know if an instance is alive and ready to serve. Without health checks, traffic routes to dead instances.

**Solution:**
```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddMySql(connStr, name: "mysql", tags: ["db", "ready"])
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"]);

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live")
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
```

**Responses:**
```json
// GET /health/ready → 200
{ "status": "Healthy", "checks": { "mysql": { "status": "Healthy", "duration": "12ms" } } }

// GET /health/ready → 503 (DB down)
{ "status": "Unhealthy", "checks": { "mysql": { "status": "Unhealthy", "description": "Connection refused" } } }
```

**Docker/Kubernetes:**
```yaml
livenessProbe:
  httpGet: { path: /health/live, port: 8080 }
readinessProbe:
  httpGet: { path: /health/ready, port: 8080 }
```

---

## 6. API Versioning

**Problem:** Changing response shape breaks every existing frontend/mobile app. Must support old + new simultaneously.

**Solution:**
```csharp
// NuGet: Asp.Versioning.Mvc, Asp.Versioning.Mvc.ApiExplorer

builder.Services.AddApiVersioning(opt =>
{
    opt.DefaultApiVersion = new ApiVersion(1, 0);
    opt.AssumeDefaultVersionWhenUnspecified = true;
    opt.ReportApiVersions = true;
    opt.ApiVersionReader = new UrlSegmentApiVersionReader();
})
.AddApiExplorer(opt =>
{
    opt.GroupNameFormat = "'v'VVV";
    opt.SubstituteApiVersionInUrl = true;
});

// Controller
[Route("api/v{version:apiVersion}/auth")]
[ApiVersion("1.0")]
public class AuthController : ApiControllerBase { ... }

// V2 with different response shape
[Route("api/v{version:apiVersion}/auth")]
[ApiVersion("2.0")]
public class AuthControllerV2 : ApiControllerBase { ... }
```

**Strategy:** Minor changes (adding optional fields) = same version. Breaking changes (removing/renaming) = new version. Deprecated: `[ApiVersion("1.0", Deprecated = true)]`.

---

## 7. DI Extension Methods

**Problem:** Program.cs grows to 400+ lines of registration soup as features added.

**Solution:** Group registrations by concern:

```csharp
// TicketStar.API/Extensions/ServiceCollectionExtensions.cs
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
        services.AddSingleton<ITokenHasher, Sha256TokenHasher>();
        services.AddSingleton<ISecureRandom, CryptoRandomService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<DbSeeder>();
        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config) { ... }
    public static IServiceCollection AddSwaggerWithAuth(this IServiceCollection services) { ... }
}

// Program.cs becomes:
builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddSwaggerWithAuth();
builder.Services.AddHealthChecks().AddMySql(connStr);
builder.Services.AddControllers();
```

---

## 8. Problem Details (RFC 9457)

**Problem:** Ad-hoc error objects (`new { error = "..." }`) — no machine-readable error codes, no documentation links, inconsistent format.

**Solution:** Standard error format built into ASP.NET:

```csharp
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
    };
});
```

**Response:**
```json
{
  "type": "https://httpstatuses.com/409",
  "title": "Conflict",
  "status": 409,
  "detail": "Email already registered.",
  "instance": "/api/v1/auth/register",
  "traceId": "0HN7P8QKGJT3S:00000001"
}
```

**Recommended:** Use `ApiResponse<T>` for successes, `ProblemDetails` for errors. Validation errors from model binding automatically follow ProblemDetails format.

---

## 9. Pagination, Filtering, Sorting

**Problem:** `GET /api/events` without pagination returns ALL records — massive payload, slow query, potential OOM.

**Solution:**
```csharp
public record PaginatedRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Sort { get; init; }
    public string? Search { get; init; }
    public int ClampedPageSize => Math.Clamp(PageSize, 1, 100); // prevent abuse
}

public record PaginatedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}
```

**API:** `GET /api/v1/events?page=2&pageSize=10&sort=-date&search=concert`

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "page": 2, "pageSize": 10, "totalCount": 47, "totalPages": 5,
    "hasPreviousPage": true, "hasNextPage": true
  }
}
```

---

## 10. Proper HTTP Status Codes

| Code | When | Example |
|------|------|---------|
| 200 | Success with body | GET, login, refresh |
| 201 | Resource created (POST) + Location header | Register, create event |
| 204 | Success, no body | DELETE, PUT |
| 400 | Malformed request (wrong types, missing fields) | Invalid JSON |
| 401 | Not authenticated | No/expired token |
| 403 | Authenticated but not authorized | User accessing admin route |
| 404 | Resource not found | GET /events/nonexistent-id |
| 409 | Conflict with current state | Duplicate email |
| 422 | Business rule rejection (valid request, rejected by logic) | Sold-out event |
| 429 | Rate limited | Too many magic link requests |
| 500 | Server error (never leak details) | Unhandled exception |

**Current bug:** Register returns 200. Should return 201 Created.

---

## 11. FluentValidation

**Problem:** DataAnnotations can't express conditional logic, cross-field validation, async validators, or composable rules.

**Solution:**
```csharp
// NuGet: FluentValidation.AspNetCore

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(255);

        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8)
            .Matches("[A-Z]").WithMessage("Must contain uppercase")
            .Matches("[a-z]").WithMessage("Must contain lowercase")
            .Matches("[0-9]").WithMessage("Must contain digit")
            .Matches("[^a-zA-Z0-9]").WithMessage("Must contain special character");

        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
    }
}

// Conditional validation
public class CreateEventValidator : AbstractValidator<CreateEventRequest>
{
    public CreateEventValidator()
    {
        RuleFor(x => x.Date).GreaterThan(DateTime.UtcNow);

        When(x => x.IsOnline, () =>
            RuleFor(x => x.StreamUrl).NotEmpty().Must(uri => Uri.TryCreate(uri, UriKind.Absolute, out _)));

        When(x => !x.IsOnline, () =>
            RuleFor(x => x.VenueName).NotEmpty());
    }
}

// Registration — auto-discovers all validators
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
```

---

## 12. Repository + Unit of Work

**Problem:** Services depend directly on `AppDbContext` — tight coupling to EF Core, hard to unit test without DB, can't swap to Dapper.

**Solution:**
```csharp
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);
    Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>>? predicate = null);
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
}

public interface IUnitOfWork
{
    IRepository<User> Users { get; }
    IRepository<Event> Events { get; }
    IRepository<Order> Orders { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```

**When to adopt:** When 3+ services share entities, need unit testing without DB, or want to use Dapper for specific queries. Not needed for current auth module.

---

## 13. MediatR / CQRS

**Problem:** Services become god classes with 8+ methods, 12+ dependencies, 500+ lines.

**Solution:** Split into individual Command/Query + Handler pairs:

```csharp
// NuGet: MediatR

// One command per use case
public record CreateEventCommand(string Title, DateTime Date) : IRequest<Result<EventDto>>;

// One handler per use case (single responsibility, minimal dependencies)
public class CreateEventHandler : IRequestHandler<CreateEventCommand, Result<EventDto>>
{
    public async Task<Result<EventDto>> Handle(CreateEventCommand cmd, CancellationToken ct)
    {
        // validation + business logic + persistence
    }
}

// Controller dispatches via MediatR
[HttpPost]
public async Task<IActionResult> Create(CreateEventCommand cmd)
    => FromResult(await _mediator.Send(cmd));
```

**Pipeline Behaviors** (cross-cutting): logging, validation, authorization run automatically before every handler.

**When:** When a service exceeds ~200 lines or handles 4+ use cases.

---

## 14. Domain Events

**Problem:** `AuthService.LoginAsync` does login + session + tokens + audit logging — too many responsibilities. Adding "send notification email" means modifying the login method.

**Solution:** Entity raises event, separate handlers react:

```csharp
public record UserLoggedInEvent(string UserId, string? Ip, string? Ua) : INotification;

// Core service just raises the event
await _mediator.Publish(new UserLoggedInEvent(user.Id, ip, ua));

// Handler 1: audit logging (existing)
public class LogSecurityEventOnLogin : INotificationHandler<UserLoggedInEvent> { ... }

// Handler 2: notification email (added 3 months later — ZERO changes to LoginAsync)
public class SendLoginNotification : INotificationHandler<UserLoggedInEvent> { ... }

// Handler 3: analytics (added 6 months later — still ZERO changes to LoginAsync)
public class TrackLoginAnalytics : INotificationHandler<UserLoggedInEvent> { ... }
```

**Key benefit:** Open/Closed Principle — login is closed for modification but open for extension through new event handlers.

---

## 15. Correlation IDs / Request Logging

**Problem:** With 100 req/s, logs are interleaved — can't tell which log line belongs to which request. User reports "I got a 500 error" → can't find relevant logs.

**Solution:**
```csharp
// TicketStar.API/Middleware/CorrelationIdMiddleware.cs
public class CorrelationIdMiddleware
{
    private const string HeaderName = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        // Use client-provided ID or generate one
        var correlationId = context.Request.Headers[HeaderName].FirstOrDefault()
            ?? context.TraceIdentifier;

        context.TraceIdentifier = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        // Every ILogger call within this scope includes CorrelationId
        using (_logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await _next(context);
        }
    }
}
```

**Logs become traceable:**
```
[INF] [Corr:abc123] POST /api/auth/login → 200 in 45ms
[INF] [Corr:def456] POST /api/auth/login → 401 in 12ms
[ERR] [Corr:def456] Database timeout during token generation  ← instantly findable
```

**Request logging middleware** also logs method, path, status code, and duration. Alerts on slow requests (>2000ms). Never logs request bodies for auth endpoints.

---

## 16. Circuit Breaker (Polly)

**Problem:** External API (Google OAuth) goes down → every login waits 30s for timeout → thread pool fills → entire API degrades.

**Solution:** After N consecutive failures, stop calling the external service for a cooldown period:

```csharp
// NuGet: Microsoft.Extensions.Http.Polly

// Three states:
// CLOSED   → normal, requests pass through, failures counted
// OPEN     → all requests immediately fail (no network call) for 30s
// HALF-OPEN → allow ONE test request to check if service recovered

builder.Services.AddHttpClient("google-auth")
    .AddPolicyHandler(
        Policy.Handle<HttpRequestException>()
            .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)))
            .WrapAsync(Policy.Handle<HttpRequestException>()
                .CircuitBreakerAsync(
                    handledEventsAllowedBeforeBreaking: 5,
                    durationOfBreak: TimeSpan.FromSeconds(30))));
```

**Timeline:**
```
Req 1-5: Google API fails → failures counted → CIRCUIT OPENS
Req 6-100: Immediately return "Google auth temporarily unavailable" (no network call)
After 30s: HALF-OPEN → allow ONE test request
Req 101: Google API → 200 OK → CIRCUIT CLOSES → normal operation
```

---

## 17. Idempotency Keys

**Problem:** User clicks "Buy Tickets" → network hiccup → frontend retries → two orders created → double charge.

**Solution:** Client sends unique key per operation. Server deduplicates:

```csharp
// Client sends: Idempotency-Key: uuid-123
// First call:  process normally, cache response
// Retry:       return cached response (no re-processing)

public class IdempotencyMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Method is not ("POST" or "PUT" or "PATCH")) { await _next(context); return; }

        var key = context.Request.Headers["Idempotency-Key"].FirstOrDefault();
        if (key is null) { await _next(context); return; }

        var cached = await _cache.GetStringAsync($"idempotency:{key}");
        if (cached is not null)
        {
            // Return EXACT same response — no re-processing
            var r = JsonSerializer.Deserialize<CachedResponse>(cached)!;
            context.Response.StatusCode = r.StatusCode;
            await context.Response.WriteAsync(r.Body);
            return;
        }

        // Process normally, capture + cache response for 24h
        await _next(context);
        // ... cache the response body ...
    }
}
```

**Frontend:**
```typescript
const key = crypto.randomUUID(); // generate ONCE per user action
await fetch('/api/v1/orders', { headers: { 'Idempotency-Key': key }, ... });
// Retry with SAME key → server returns cached response → no double order
```

---

## 18. Outbox Pattern

**Problem:** After creating order, need to save to DB + send email + publish to queue. Can't make multiple systems atomic — if email sends but DB save fails, email for non-existent order.

**Solution:** Save outbox messages alongside data in same DB transaction:

```csharp
// STEP 1: Everything in ONE transaction
var order = new Order { ... };
_db.Orders.Add(order);
_db.OutboxMessages.Add(new OutboxMessage
{
    Type = "OrderConfirmationEmail",
    Payload = JsonSerializer.Serialize(new { order.Id, order.UserEmail })
});
_db.OutboxMessages.Add(new OutboxMessage
{
    Type = "InventoryReservation",
    Payload = JsonSerializer.Serialize(new { order.Id, order.TicketTypeId })
});
await _db.SaveChangesAsync(); // ALL saved atomically

// STEP 2: Background worker polls outbox every 5s, dispatches messages
// If dispatch fails → retry with exponential backoff → dead-letter after 5 retries
```

**Guarantee:** Order + outbox = atomic (same transaction). Outbox → email/queue = eventually consistent (background worker retries).

---

## 19. Vertical Slice Architecture

**Problem:** Traditional layers group by technical concern — adding a feature touches 5 files across 5 directories. Feature logic is scattered.

**Solution:** Group by feature/use case:

```
Features/
├── Auth/
│   ├── Register/
│   │   ├── RegisterEndpoint.cs
│   │   ├── RegisterRequest.cs
│   │   ├── RegisterHandler.cs
│   │   └── RegisterValidator.cs
│   ├── Login/
│   │   ├── LoginEndpoint.cs
│   │   └── LoginHandler.cs
│   └── _Shared/
│       └── TokenResponse.cs
├── Events/
│   ├── Create/
│   ├── List/
│   └── GetById/
```

**Benefits:** Understand feature = open ONE folder. Add feature = create ONE folder. Delete feature = delete ONE folder.

**When:** 10+ endpoints or 3+ developers (reduces merge conflicts). Current auth module is fine as-is.

---

## 20. Minimal APIs

**Problem:** Controllers have boilerplate for simple endpoints (7 lines just to return `{ status: "healthy" }`).

**Solution:** ASP.NET 8 inline route definitions:

```csharp
// Simple — one line
app.MapGet("/api/v1/status", () => Results.Ok(new { status = "running" }));

// With DI + parameters
app.MapGet("/api/v1/events/{id:guid}", async (Guid id, AppDbContext db) =>
    await db.Events.FindAsync(id) is Event e
        ? Results.Ok(ApiResponse<EventDto>.Ok(new EventDto(e)))
        : Results.NotFound());

// Route groups
var events = app.MapGroup("/api/v1/events").RequireAuthorization();
events.MapGet("/", ListEvents);
events.MapPost("/", CreateEvent);
events.MapDelete("/{id}", DeleteEvent);
```

| Scenario | Use |
|----------|-----|
| Complex logic (auth, payments) | **Controllers** |
| Simple CRUD, health, status | **Minimal APIs** |
| Both in same project? | **Yes** — they coexist |

Minimal APIs skip MVC pipeline → slightly faster (~1-2ms). Negligible for most apps.

---

## Quick Reference — HTTP Status Codes

```
Success:     200 OK │ 201 Created │ 204 No Content
Client:      400 Bad Request │ 422 Unprocessable Entity
Auth:        401 Unauthorized │ 403 Forbidden
State:       404 Not Found │ 409 Conflict
Limits:      429 Too Many Requests
Server:      500 Internal Server Error │ 503 Service Unavailable
```

## Quick Reference — Resource Naming

```
GET    /api/v1/events              ← list (plural nouns, never verbs)
GET    /api/v1/events/{id}         ← single
POST   /api/v1/events              ← create
PUT    /api/v1/events/{id}         ← full update
PATCH  /api/v1/events/{id}         ← partial update
DELETE /api/v1/events/{id}         ← soft delete
GET    /api/v1/events/{id}/tickets ← nested (max 2 levels)
```
