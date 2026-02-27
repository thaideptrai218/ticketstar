# TicketStar Backend Design Patterns

This document tracks implemented design patterns in the .NET 8 backend architecture.

## Pattern Implementation Status

### 1. Result Pattern ✅ Implemented

**Purpose:** Transport-agnostic error handling for application services.

**Files:**

- `TicketStar.Application/Common/Result.cs` — Generic and non-generic Result types
- `TicketStar.Application/Common/ResultError.cs` — Error classification enum

**Key Features:**

- Service methods return `Result<T>` instead of throwing exceptions
- Errors classified via `ResultError` enum (Validation, Unauthorized, Forbidden, NotFound, Conflict, Internal)
- Single mapping point in ApiControllerBase converts errors to HTTP status codes
- Application layer remains HTTP-unaware

**Benefits:**

- Predictable error handling without exception overhead
- Clear separation: business logic errors vs. system exceptions
- Enables easy integration with multiple transport protocols (HTTP, gRPC, etc.)
- Simplifies testing of error scenarios

---

### 2. API Response Envelope ✅ Implemented

**Purpose:** Standardized JSON response wrapper for all API responses.

**Files:**

- `TicketStar.API/Models/ApiResponse.cs` — Generic and non-generic response types

**Key Features:**

- Fields: `success`, `data/message`, `error`, `traceId`
- Generic `ApiResponse<T>` for typed responses
- Non-generic `ApiResponse` for messages
- Factory methods: `Ok()`, `Fail()`
- TraceId for request correlation and debugging

**Response Examples:**

Success (201 Created):

```json
{
    "success": true,
    "data": {
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "accessToken": "eyJhbGciOiJIUzI1...",
        "refreshToken": "eyJhbGciOiJIUzI1..."
    },
    "error": null,
    "traceId": "0HN0IRFA4UKCJ:00000001"
}
```

Error (400 Bad Request):

```json
{
    "success": false,
    "data": null,
    "error": "Email is required",
    "traceId": "0HN0IRFA4UKCJ:00000001"
}
```

---

### 3. Global Exception Middleware ✅ Implemented

**Purpose:** Safety net for unhandled exceptions, converts them to structured JSON responses.

**Files:**

- `TicketStar.API/Middleware/GlobalExceptionMiddleware.cs`

**Key Features:**

- Catches all unhandled exceptions in the request pipeline
- Logs exception details for debugging
- Returns JSON response (not HTML) with 500 status
- Includes TraceId for correlation with logs

**Pipeline Integration:**

```csharp
app.UseMiddleware<GlobalExceptionMiddleware>();  // First middleware
```

**Benefits:**

- Prevents leaking exception details to clients
- Ensures consistent error response format
- Central logging point for exceptions
- Graceful degradation of API

---

### 4. ApiControllerBase ✅ Implemented

**Purpose:** Base controller providing Result→HTTP mapping and response helpers.

**Files:**

- `TicketStar.API/Controllers/ApiControllerBase.cs`

**Key Features:**

- Abstract base class for all controllers
- `FromResult<T>(Result<T>)` → 200 OK or error status
- `FromResult(Result, message?)` → 200 OK or error status
- `CreatedFromResult<T>(...)` → 201 Created or error status
- Maps `ResultError` enum to HTTP status codes

**Error Mapping:**
| ResultError | HTTP Status |
|---|---|
| Validation | 400 Bad Request |
| Unauthorized | 401 Unauthorized |
| Forbidden | 403 Forbidden |
| NotFound | 404 Not Found |
| Conflict | 409 Conflict |
| Internal | 500 Internal Server Error |

**Example Usage:**

```csharp
[HttpPost("register")]
public async Task<IActionResult> Register(RegisterRequest req)
{
    var result = await _authService.RegisterAsync(req.Email, req.Password);
    return CreatedFromResult(result, actionName: nameof(GetProfile));
}
```

---

### 5. Options Pattern ✅ Implemented

**Purpose:** Strongly-typed configuration with startup validation.

**Files:**

- `TicketStar.Application/Options/JwtOptions.cs`
- `TicketStar.Application/Options/GoogleAuthOptions.cs`

**Key Features:**

- Immutable properties (init-only)
- Named configuration section ("Jwt", "GoogleAuth")
- Fluent validation at service registration
- ValidateOnStart() prevents runtime configuration errors

**Example: JwtOptions**

```csharp
public class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Secret { get; init; } = "";
    public string Issuer { get; init; } = "";
    public string Audience { get; init; } = "";
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 7;
}
```

**Registration with Validation:**

```csharp
services.AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .Validate(o => o.Secret.Length >= 32, "JWT secret must be at least 32 characters")
    .ValidateOnStart();
```

**Benefits:**

- Fail-fast on misconfiguration
- Type-safe access to settings
- Single source of truth per configuration
- Easier refactoring of settings

---

### 6. Health Checks ✅ Implemented

**Purpose:** Liveness and readiness probes for container orchestration.

**Files:**

- `TicketStar.API/Program.cs` — Health check registration and endpoints

**Endpoints:**

| Endpoint        | Purpose         | Checks                                     |
| --------------- | --------------- | ------------------------------------------ |
| `/health/live`  | Liveness probe  | API self-check (always healthy if running) |
| `/health/ready` | Readiness probe | MySQL connectivity                         |

**Implementation:**

```csharp
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

**Benefits:**

- Kubernetes uses /health/ready to route traffic
- /health/live detects API crashes
- Graceful shutdown coordination
- Prevents requests to degraded instances

---

### 7. Pagination ✅ Implemented

**Purpose:** Support both offset-based and cursor-based pagination strategies.

**Files:**

- `TicketStar.Application/Common/PaginatedRequest.cs`
- `TicketStar.Application/Common/PaginatedResponse.cs`

**Offset-Based Pagination:**

```csharp
public class PaginatedRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class PaginatedResponse<T>
{
    public List<T> Items { get; set; }
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
}
```

**Cursor-Based Pagination:**

```csharp
public class CursorPaginatedRequest
{
    public string? Cursor { get; set; }
    public int Limit { get; set; } = 10;
}

public class CursorPaginatedResponse<T>
{
    public List<T> Items { get; set; }
    public string? NextCursor { get; set; }
    public bool HasMore { get; set; }
}
```

**When to Use:**

- **Offset:** Small datasets, random access needed
- **Cursor:** Large datasets, real-time feeds, consistent iteration

---

### 8. Repository & Unit of Work Patterns ✅ Implemented

**Purpose:** Abstraction for data access with transaction coordination.

**Files:**

- `TicketStar.Domain/Interfaces/IRepository<T>` — Generic repository contract
- `TicketStar.Domain/Interfaces/IUnitOfWork` — Transaction coordinator
- `TicketStar.Infrastructure/Repositories/EfRepository<T>` — EF Core implementation
- `TicketStar.Infrastructure/Repositories/EfUnitOfWork` — EF Core unit of work
- Entity-specific repositories:
    - `IUserRepository`, `UserRepository`
    - `IRefreshTokenRepository`, `RefreshTokenRepository`
    - `IMagicLinkRepository`, `MagicLinkRepository`
    - `IAuthIdentityRepository`, `AuthIdentityRepository`
    - `ISecurityEventRepository`, `SecurityEventRepository`

**Generic Repository Interface:**

```csharp
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(object id);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task SaveChangesAsync();
}
```

**Unit of Work Interface:**

```csharp
public interface IUnitOfWork
{
    IUserRepository Users { get; }
    IRefreshTokenRepository RefreshTokens { get; }
    IMagicLinkRepository MagicLinks { get; }
    IAuthIdentityRepository AuthIdentities { get; }
    ISecurityEventRepository SecurityEvents { get; }
    Task<int> SaveChangesAsync();
}
```

**Service Example:**

```csharp
public class AuthService
{
    private readonly IUnitOfWork _uow;

    public async Task<Result<User>> RegisterAsync(string email, string password)
    {
        var existingUser = await _uow.Users.FindByEmailAsync(email);
        if (existingUser != null)
            return Result<User>.Failure("Email already registered", ResultError.Conflict);

        var user = new User { Email = email, PasswordHash = Hash(password) };
        await _uow.Users.AddAsync(user);
        await _uow.SaveChangesAsync();

        return Result<User>.Success(user);
    }
}
```

**Benefits:**

- Testable services via mock repositories
- Consistent query interface across entities
- Single SaveChangesAsync() for transactions
- Easy to swap implementations (EF → Dapper, etc.)

---

### 9. Dependency Injection Extensions ✅ Implemented

**Purpose:** Clean Program.cs via extension methods for service registration.

**Files:**

- `TicketStar.API/Extensions/ServiceCollectionExtensions.cs`

**Extension Methods:**

- `AddApplicationServices()` — Security, business services, seeder
- `AddRepositories()` — UoW and all repository registrations
- `AddJwtAuthentication()` — JWT bearer, options validation
- `AddSwaggerWithAuth()` — Swagger documentation with Bearer scheme
- `AddRateLimiting()` — Rate limiter policies

**Program.cs (~65 lines, clean and readable):**

```csharp
var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(...);

// Application
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddRepositories();
builder.Services.AddRateLimiting();
builder.Services.AddSwaggerWithAuth();
builder.Services.AddHealthChecks();
builder.Services.AddControllers();
builder.Services.AddCors(...);

var app = builder.Build();

// Seed & pipeline
using (var scope = app.Services.CreateScope()) { ... }
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks(...);
app.Run();
```

**Benefits:**

- Horizontal organization by feature
- Easy to enable/disable services
- Reusable extension methods
- Readable, maintainable startup

---

### 10. HTTP Status Codes ✅ Implemented

**Purpose:** RESTful HTTP semantics for all endpoints.

**Implementation:**

- `201 Created` on successful POST (via `CreatedFromResult()`)
- `400 Bad Request` for validation errors (Validation ResultError)
- `401 Unauthorized` for missing/invalid credentials
- `403 Forbidden` for insufficient permissions
- `404 Not Found` for missing resources
- `409 Conflict` for duplicate emails, deleted tokens, etc.
- `429 Too Many Requests` for rate-limited endpoints
- `500 Internal Server Error` for unhandled exceptions

**Example:**

```csharp
[HttpPost("register")]
public async Task<IActionResult> Register(RegisterRequest req)
{
    var result = await _authService.RegisterAsync(req.Email, req.Password);
    return CreatedFromResult(result, actionName: nameof(GetProfile), routeValues: new { userId = ... });
}
// Success → 201 Created with Location header
// Validation error → 400 Bad Request
// Conflict (email exists) → 409 Conflict
```

---

## Not Yet Implemented

### 11. CQRS Pattern

Command/Query Responsibility Segregation for complex workflows.

- **Status:** Not yet implemented
- **Rationale:** Current query patterns are simple; CQRS overhead not justified
- **Future:** Consider when read models diverge significantly from entities

### 12. Event Sourcing

Immutable event log as source of truth.

- **Status:** Not yet implemented
- **Rationale:** Audit trail needs simpler for current phase
- **Future:** Evaluate for high-compliance scenarios (PCI-DSS, HIPAA)

### 13. Specification Pattern

Encapsulate query logic in reusable specifications.

- **Status:** Not yet implemented
- **Rationale:** Current queries are straightforward
- **Future:** Consider when complex filtering becomes common

---

## Integration Summary

| Pattern                     | Layer                 | Implemented | Status    |
| --------------------------- | --------------------- | ----------- | --------- |
| Result                      | Application           | Yes         | ✅        |
| API Response Envelope       | API                   | Yes         | ✅        |
| Global Exception Middleware | API                   | Yes         | ✅        |
| ApiControllerBase           | API                   | Yes         | ✅        |
| Options Pattern             | Application           | Yes         | ✅        |
| Health Checks               | API                   | Yes         | ✅        |
| Pagination                  | Application           | Yes         | ✅        |
| Repository & UoW            | Domain/Infrastructure | Yes         | ✅        |
| DI Extensions               | API                   | Yes         | ✅        |
| HTTP Status Codes           | API                   | Yes         | ✅        |
| CQRS                        | —                     | No          | 🔜 Future |
| Event Sourcing              | —                     | No          | 🔜 Future |
| Specification               | Domain                | No          | 🔜 Future |

---

## Design Philosophy

The TicketStar backend follows these principles:

1. **Layered Architecture** — Clear separation of concerns (Domain → Application → Infrastructure → API)
2. **Transport Agnostic** — Services don't know about HTTP; easy to add gRPC later
3. **Fail-Fast Configuration** — Errors caught at startup, not runtime
4. **Predictable Error Handling** — No exception-based control flow
5. **Testability** — Interfaces throughout, easy to mock dependencies
6. **Minimal Startup** — Clean Program.cs via extension methods
7. **Standards-Based** — REST principles, .NET conventions, SOLID principles

---

## References

- **Result Pattern:** [Functional error handling in .NET](https://www.martinfowler.com/articles/failureAndProgress.html)
- **Repository Pattern:** [Data Access Patterns - Microsoft Docs](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
- **Options Pattern:** [Configuration in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/options)
- **Health Checks:** [Health checks in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks)
