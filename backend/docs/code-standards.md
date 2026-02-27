# Code Standards & Organization

## Directory Structure

### Solution Layout

```
TicketStar.sln
├── src/
│   ├── TicketStar.Domain/           # Business logic & entities
│   │   ├── Entities/                # Domain entities (User, Event, Order, etc.)
│   │   ├── Enums/                   # Enums (UserRole, PaymentStatus, etc.)
│   │   └── Interfaces/              # Contracts (IRepository<T>, IUnitOfWork, etc.)
│   ├── TicketStar.Application/      # Application services & DTOs
│   │   ├── Common/                  # Shared patterns (Result<T>, Pagination, etc.)
│   │   ├── DTOs/                    # Data transfer objects
│   │   ├── Interfaces/              # Service contracts (IAuthService, etc.)
│   │   ├── Options/                 # Options pattern (JwtOptions, GoogleAuthOptions)
│   │   └── Services/                # Business logic & security services
│   ├── TicketStar.Infrastructure/   # Data access & external services
│   │   ├── Data/                    # EF Core DbContext & migrations
│   │   └── Repositories/            # Repository implementations
│   └── TicketStar.API/              # Presentation layer
│       ├── Controllers/             # API endpoints
│       ├── Extensions/              # DI & Swagger setup
│       ├── Middleware/              # Pipeline middleware
│       ├── Models/                  # API response models
│       └── Program.cs               # Application startup (~65 lines)
└── tests/
    └── TicketStar.Tests/            # Unit & integration tests
```

### Layer Responsibilities

**Domain** — Business rules, entities, enums, repository contracts

- No dependencies on other layers
- Pure C# with no framework references
- Defines interfaces that Infrastructure implements

**Application** — Services, use cases, DTOs, options

- Depends only on Domain
- Transport-agnostic (no HTTP concepts)
- Implements business logic & security

**Infrastructure** — EF Core, repositories, external integrations

- Depends on Domain & Application
- Implements IRepository<T>, IUnitOfWork
- Handles database operations

**API** — Controllers, middleware, DI setup, request/response mapping

- Depends on all layers
- Maps HTTP to Application Result types
- Minimal business logic

## Error Handling & Result Pattern

### Transport-Agnostic Error Classification

All errors are classified via `ResultError` enum:

```csharp
public enum ResultError
{
    Validation,     // 400 Bad Request
    Unauthorized,   // 401 Unauthorized
    Forbidden,      // 403 Forbidden
    NotFound,       // 404 Not Found
    Conflict,       // 409 Conflict
    Internal        // 500 Internal Server Error
}
```

### Result Types

**Generic Result** — for operations returning data:

```csharp
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public ResultError? ErrorType { get; }

    public static Result<T> Success(T value) => ...
    public static Result<T> Failure(string error, ResultError errorType) => ...
}
```

**Non-generic Result** — for void operations:

```csharp
public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public ResultError? ErrorType { get; }

    public static Result Success() => ...
    public static Result Failure(string error, ResultError errorType) => ...
}
```

### Usage in Services

Services return `Result<T>` or `Result` instead of throwing exceptions:

```csharp
public async Task<Result<User>> RegisterAsync(string email, string password)
{
    if (email == null)
        return Result<User>.Failure("Email is required", ResultError.Validation);

    var existingUser = await _userRepo.FindByEmailAsync(email);
    if (existingUser != null)
        return Result<User>.Failure("Email already registered", ResultError.Conflict);

    // ... create user ...
    return Result<User>.Success(user);
}
```

### Controller Mapping

Controllers use `FromResult<T>()` and `CreatedFromResult<T>()` helpers to map Results to HTTP responses:

```csharp
[HttpPost("register")]
public async Task<IActionResult> Register(RegisterRequest req)
{
    var result = await _authService.RegisterAsync(req.Email, req.Password);
    return CreatedFromResult(result, actionName: nameof(GetProfile));
}
```

Mapping logic:
| ResultError | HTTP Status |
|---|---|
| Validation | 400 Bad Request |
| Unauthorized | 401 Unauthorized |
| Forbidden | 403 Forbidden |
| NotFound | 404 Not Found |
| Conflict | 409 Conflict |
| Internal | 500 Internal Server Error |

## API Response Envelope

All JSON responses use a standardized envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "traceId": "0HN0IRFA4UKCJ:00000001"
}
```

Envelope fields:

- `success` — bool indicating operation success
- `data` — T? response data (null if error)
- `error` — string? error message (null if success)
- `traceId` — correlation ID for logging

## Dependency Injection Setup

Clean DI configuration via extension methods in `ServiceCollectionExtensions.cs`:

```csharp
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddRepositories();
builder.Services.AddRateLimiting();
```

### Lifetimes

- **Singleton** — Security services (IPasswordHasher, ITokenHasher, ISecureRandom)
- **Scoped** — DbContext-dependent services & repositories
- **Transient** — Stateless utilities (rarely used)

## Options Pattern

Strongly-typed configuration with startup validation.

### Example: JwtOptions

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

Registration with validation:

```csharp
services.AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .Validate(o => o.Secret.Length >= 32, "JWT secret must be at least 32 characters")
    .ValidateOnStart();
```

## Health Checks

Two health check endpoints:

| Endpoint        | Purpose         | Checks             |
| --------------- | --------------- | ------------------ |
| `/health/live`  | Liveness probe  | API self-check     |
| `/health/ready` | Readiness probe | MySQL connectivity |

Used by Kubernetes/load balancers for container orchestration.

## Pagination

### Offset-based

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

### Cursor-based

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

## Repository & Unit of Work Patterns

### Generic Repository Interface

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

### Entity-Specific Repositories

- `IUserRepository` — queries like `FindByEmailAsync()`, `FindByClaimAsync()`
- `IRefreshTokenRepository` — token lifecycle queries
- `IMagicLinkRepository` — magic link verification
- `IAuthIdentityRepository` — OAuth identity linking
- `ISecurityEventRepository` — audit log queries

### Unit of Work Pattern

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

Single entry point for transaction management and repository coordination.

## Global Exception Middleware

All unhandled exceptions are caught by `GlobalExceptionMiddleware` and converted to JSON responses with trace IDs for debugging:

```csharp
// Registers at pipeline start in Program.cs:
app.UseMiddleware<GlobalExceptionMiddleware>();
```

Response format:

```json
{
    "success": false,
    "error": "An internal error occurred.",
    "traceId": "0HN0IRFA4UKCJ:00000001"
}
```

## API Controller Base Class

All controllers inherit from `ApiControllerBase` to standardize response handling:

```csharp
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult FromResult<T>(Result<T> result)
    protected IActionResult FromResult(Result result, string? successMessage = null)
    protected IActionResult CreatedFromResult<T>(Result<T> result, string? actionName = null, object? routeValues = null)
}
```

## Code Quality Standards

- Keep code files under 200 lines for context management
- Use meaningful names (kebab-case files, PascalCase classes/methods)
- Write descriptive comments for complex logic
- Avoid fake data; use real implementations
- Use try-catch for security-critical operations
- Write unit tests for business logic
- Keep Program.cs minimal (~65 lines) via extension methods
