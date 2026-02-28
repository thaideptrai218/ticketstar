# TicketStar Backend API Design — Visual Explanation

## 1. Layered Architecture Overview

The backend uses **Clean Architecture** with four distinct layers, each with clear responsibilities:

```
┌─────────────────────────────────────────────────────────────┐
│                   TicketStar.API (Web Layer)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers (AuthController, EventController, etc.) │  │
│  │  ↓                                                   │  │
│  │  ApiControllerBase (FromResult, CreatedFromResult)  │  │
│  │  ↓                                                   │  │
│  │  Maps Result<T> → HTTP Status Codes                 │  │
│  │  Wraps response in ApiResponse<T> envelope          │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│            TicketStar.Application (Business Logic)          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services (AuthService, EventService, etc.)         │  │
│  │  • RegisterAsync()     → Result<TokenResponse>      │  │
│  │  • LoginAsync()        → Result<TokenResponse>      │  │
│  │  • CreateEventAsync()  → Result<EventDto>           │  │
│  │                                                      │  │
│  │  DTOs (Data Transfer Objects)                       │  │
│  │  • LoginRequest, RegisterRequest                    │  │
│  │  • TokenResponse, EventDto                          │  │
│  │                                                      │  │
│  │  Validation (FluentValidation rules)                │  │
│  │  • Password complexity, email format, etc.          │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│              TicketStar.Domain (Core Business Logic)        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Entities (Domain Models)                           │  │
│  │  • User, AuthIdentity, RefreshToken                 │  │
│  │  • Event, TicketType, Order, Ticket                 │  │
│  │  • Payment, CheckIn, StaffAssignment                │  │
│  │                                                      │  │
│  │  Interfaces (Contracts)                             │  │
│  │  • IRepository<T>, IAuthService, ITokenService      │  │
│  │  • IPasswordHasher, ITokenHasher, ISecureRandom     │  │
│  │                                                      │  │
│  │  Enums & Value Objects                              │  │
│  │  • PaymentStatus, OrderStatus, AuthProvider         │  │
│  │  • NO EXTERNAL DEPENDENCIES (pure C#)               │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────┐
│           TicketStar.Infrastructure (Data Access)           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AppDbContext (EF Core DbContext)                   │  │
│  │  • DbSet<User>, DbSet<Event>, DbSet<Order>, etc.   │  │
│  │  • Migrations, configuration                        │  │
│  │                                                      │  │
│  │  Repositories (IRepository<T> implementations)       │  │
│  │  • UserRepository, EventRepository, etc.            │  │
│  │                                                      │  │
│  │  External Services                                  │  │
│  │  • Google OAuth integration                         │  │
│  │  • SePay payment integration                        │  │
│  │  • Redis cache service                              │  │
│  │  • RabbitMQ message consumers (MassTransit)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│              ┌───────────────────────┐                      │
│              │   MySQL 8.0           │                      │
│              │   Redis 7             │                      │
│              │   RabbitMQ 3          │                      │
│              └───────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

## 2. The Result Pattern — Business Logic Meets HTTP

**Problem:** Throwing exceptions for expected business outcomes is expensive and mixes concerns.

**Solution:** Return success/failure as values:

```csharp
// Old way (throws exceptions)
public async Task<TokenResponse> LoginAsync(LoginRequest req)
{
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
    if (user is null) throw new UnauthorizedAccessException("Invalid credentials");
    if (!_hasher.Verify(req.Password, user.PasswordHash))
        throw new UnauthorizedAccessException("Invalid credentials");

    var token = _tokenService.GenerateToken(user);
    return new TokenResponse { AccessToken = token.AccessToken, ... };
}

// New way (returns Result)
public async Task<Result<TokenResponse>> LoginAsync(LoginRequest req, string? ip, string? ua)
{
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
    if (user is null)
        return Result<TokenResponse>.Failure("Invalid credentials", StatusCodes.Status401Unauthorized);

    if (!_hasher.Verify(req.Password, user.PasswordHash))
        return Result<TokenResponse>.Failure("Invalid credentials", StatusCodes.Status401Unauthorized);

    var token = _tokenService.GenerateToken(user);
    return Result<TokenResponse>.Success(new TokenResponse { AccessToken = token.AccessToken, ... });
}
```

### Result<T> — Success Case

```
Result<TokenResponse>
├── IsSuccess: true
├── Value: TokenResponse
│   ├── AccessToken: "eyJhbGc..."
│   ├── RefreshToken: "abc123..."
│   └── ExpiresIn: 900 (15 minutes)
├── Error: null
└── StatusCode: 200
```

### Result<T> — Failure Case

```
Result<TokenResponse>
├── IsSuccess: false
├── Value: null
├── Error: "Invalid credentials"
├── ErrorType: ResultError.Unauthorized
└── StatusCode: 401
```

### Result Implementation

```csharp
public class Result<T>
{
    public bool IsSuccess { get; private set; }
    public T? Value { get; private set; }
    public string? Error { get; private set; }
    public ResultError? ErrorType { get; private set; }

    private Result(T value)
    {
        IsSuccess = true;
        Value = value;
        ErrorType = null;
    }

    private Result(string error, ResultError errorType)
    {
        IsSuccess = false;
        Error = error;
        ErrorType = errorType;
    }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error, ResultError type) => new(error, type);
}

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

## 3. API Response Envelope — Consistent JSON Shape

**Problem:** Different endpoints return different JSON shapes.

**Solution:** Every response follows the same structure:

### Success Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "abc123xyz...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  },
  "error": null,
  "traceId": "0HN7P8QKGJT3S:00000001"
}
```

### Failure Response (Invalid Credentials)
```json
{
  "success": false,
  "data": null,
  "error": "Invalid credentials",
  "traceId": "0HN7P8QKGJT3S:00000002"
}
```

### Failure Response (Validation Error)
```json
{
  "success": false,
  "data": null,
  "error": "Email is required. Password must be at least 8 characters.",
  "traceId": "0HN7P8QKGJT3S:00000003"
}
```

## 4. From Controller to HTTP Response — Complete Flow

```
REQUEST:  POST /api/auth/login
          Content-Type: application/json
          {
            "email": "user@example.com",
            "password": "SecurePass123!"
          }

          ↓ (HTTP enters controller)

[AuthController.Login]
  ↓
  AuthController receives LoginRequest
  ↓
  calls _authService.LoginAsync(request, ip, ua)
  ↓

[AuthService.LoginAsync]
  ├─ Query database for user by email
  ├─ IF user not found → return Result<TokenResponse>.Failure("Invalid credentials", Unauthorized)
  ├─ ELSE verify password with Argon2
  │   ├─ IF password invalid → return Result<TokenResponse>.Failure("Invalid credentials", Unauthorized)
  │   ├─ ELSE create JWT token + refresh token
  │   └─ return Result<TokenResponse>.Success(tokenResponse)
  ↓ (back to controller)

[AuthController.Login contd.]
  ↓
  result = Result<TokenResponse> (either Success or Failure)
  ↓
  return FromResult(result)
  ↓

[ApiControllerBase.FromResult]
  ├─ IF result.IsSuccess
  │   └─ return Ok(ApiResponse<TokenResponse>.Ok(result.Value, traceId))
  │       (wraps in ApiResponse<T>, returns 200 OK)
  │
  ├─ ELSE result.IsFailure
  │   ├─ map result.ErrorType → HTTP status code
  │   │   Unauthorized → 401
  │   │   Validation → 400
  │   │   NotFound → 404
  │   │   Conflict → 409
  │   │   Forbidden → 403
  │   │   Internal → 500
  │   └─ return StatusCode(401, ApiResponse<TokenResponse>.Fail(result.Error, traceId))
  ↓ (HTTP response sent to client)

RESPONSE:
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "abc123...",
      "expiresIn": 900,
      "tokenType": "Bearer"
    },
    "error": null,
    "traceId": "0HN7P8QKGJT3S:00000001"
  }

  OR

  HTTP/1.1 401 Unauthorized
  Content-Type: application/json

  {
    "success": false,
    "data": null,
    "error": "Invalid credentials",
    "traceId": "0HN7P8QKGJT3S:00000002"
  }
```

## 5. How Controllers Use The Base Class

All API controllers inherit from `ApiControllerBase`, which provides three helper methods:

### Pattern 1: FromResult<T> — For queries returning data
```csharp
[HttpGet("{id}")]
public async Task<IActionResult> GetEvent(string id)
{
    var result = await _eventService.GetByIdAsync(id);
    return FromResult(result);  // ← automatically handles Success/Failure
}
```

**Response if Success:**
```json
{
  "success": true,
  "data": { "id": "evt_123", "title": "Concert", "date": "2026-03-15", ... },
  "traceId": "..."
}
```

**Response if Failure (NotFound):**
```json
{
  "success": false,
  "data": null,
  "error": "Event not found",
  "traceId": "..."
}
```

### Pattern 2: CreatedFromResult<T> — For POST (201 Created)
```csharp
[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterRequest request)
{
    var result = await _authService.RegisterAsync(request, GetIp(), GetUserAgent());
    return CreatedFromResult(result);  // ← returns 201 Created on success
}
```

**Response if Success:**
```
HTTP/1.1 201 Created
Location: /api/auth/profile/user_123

{
  "success": true,
  "data": { "id": "user_123", "email": "user@example.com", ... },
  "traceId": "..."
}
```

### Pattern 3: FromResult (Void) — For operations without data
```csharp
[HttpPost("logout")]
[Authorize]
public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
{
    var result = await _authService.LogoutAsync(request.RefreshToken);
    return FromResult(result, "Logged out successfully.");  // ← includes success message
}
```

**Response if Success:**
```json
{
  "success": true,
  "message": "Logged out successfully.",
  "traceId": "..."
}
```

## 6. Error Type Mapping — Business Layer to HTTP

```
┌──────────────────────────────────────────────────────────────┐
│           ResultError Enum → HTTP Status Codes               │
├──────────────────────────────────────────────────────────────┤
│ ResultError.Validation   → 400 Bad Request                   │
│   (Invalid input, missing fields, business rule rejection)   │
│                                                              │
│ ResultError.Unauthorized → 401 Unauthorized                  │
│   (No authentication or invalid credentials)                 │
│                                                              │
│ ResultError.Forbidden    → 403 Forbidden                     │
│   (Authenticated but lacks permission)                       │
│                                                              │
│ ResultError.NotFound     → 404 Not Found                     │
│   (Resource doesn't exist)                                   │
│                                                              │
│ ResultError.Conflict     → 409 Conflict                      │
│   (Email already registered, duplicate key)                  │
│                                                              │
│ ResultError.Internal     → 500 Internal Server Error         │
│   (Unexpected server-side error)                             │
└──────────────────────────────────────────────────────────────┘
```

## 7. Key Benefits of This Design

```
┌─────────────────────────────────────────────────────────────┐
│  Benefit                │  How It Helps                     │
├─────────────────────────┼──────────────────────────────────┤
│ No Exceptions for       │ Fast (~1000x faster than         │
│ Business Logic          │ exception handling)              │
│                         │ Cleaner code flow                │
├─────────────────────────┼──────────────────────────────────┤
│ Consistent JSON Shape   │ Frontend handles ALL endpoints   │
│                         │ the same way (single parser)     │
├─────────────────────────┼──────────────────────────────────┤
│ Transport Agnostic      │ Result pattern lives in          │
│                         │ Application layer (no HTTP)      │
│                         │ Can reuse for gRPC, GraphQL      │
├─────────────────────────┼──────────────────────────────────┤
│ Automatic Error Mapping │ ResultError → HTTP status code   │
│                         │ happens in ONE place             │
│                         │ (ApiControllerBase)              │
├─────────────────────────┼──────────────────────────────────┤
│ Traceability            │ Every response includes traceId  │
│                         │ Can trace errors in logs         │
├─────────────────────────┼──────────────────────────────────┤
│ Type Safe               │ Compiler enforces success/        │
│                         │ failure handling                 │
│                         │ Can't forget to check IsSuccess  │
└─────────────────────────────────────────────────────────────┘
```

## 8. Request/Response Lifecycle Diagram

```
┌──────────────┐
│  Browser     │
│  Frontend    │
└──────┬───────┘
       │
       │ POST /api/auth/login
       │ { email, password }
       │
       ▼
┌─────────────────────────────┐
│   ASP.NET Core Pipeline     │
├─────────────────────────────┤
│ 1. CORS Middleware          │
│ 2. Authentication Middleware│
│ 3. Authorization Middleware │
│ 4. Rate Limiting Middleware │
│ 5. Routing → AuthController │
└──────┬──────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  AuthController.Login()      │
│  (Endpoint)                  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  AuthService.LoginAsync()    │
│  (Business Logic)            │
│                              │
│  ┌──────────────────────┐    │
│  │ Lookup user by email │    │
│  └──────────┬───────────┘    │
│             │                │
│             ▼                │
│  ┌──────────────────────┐    │
│  │ Verify password      │    │
│  └──────────┬───────────┘    │
│             │                │
│             ▼                │
│  ┌──────────────────────┐    │
│  │ Generate JWT + Refresh   │
│  │ Token                │    │
│  └──────────┬───────────┘    │
│             │                │
│    Result<TokenResponse>     │
│    .Success(token)           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  ApiControllerBase           │
│  .FromResult(result)         │
│                              │
│  ├─ Check result.IsSuccess   │
│  ├─ Map ErrorType → Status   │
│  ├─ Wrap in ApiResponse<T>   │
│  └─ Return IActionResult     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  HTTP Response               │
│                              │
│  200 OK or 401 Unauthorized  │
│  Content-Type: application/  │
│  json                        │
│                              │
│  {                           │
│    "success": true/false,    │
│    "data": {...},            │
│    "error": null/"message",  │
│    "traceId": "..."          │
│  }                           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────┐
│  Browser     │
│  Frontend    │
│  Parses JSON │
└──────────────┘
```

## 9. Key Files Reference

```
Backend Structure:
├── TicketStar.API/
│   ├── Controllers/
│   │   ├── ApiControllerBase.cs          ← FromResult, CreatedFromResult
│   │   └── AuthController.cs             ← Login, Register, Refresh
│   ├── Middleware/
│   │   ├── GlobalExceptionMiddleware.cs  ← Catches unhandled exceptions
│   │   └── CorrelationIdMiddleware.cs    ← Tracing
│   ├── Models/
│   │   └── ApiResponse.cs                ← Response envelope
│   ├── Extensions/
│   │   └── ServiceCollectionExtensions.cs ← DI setup
│   └── Program.cs                        ← Configuration
│
├── TicketStar.Application/
│   ├── Common/
│   │   ├── Result.cs                     ← Result<T> and Result
│   │   └── ApiResponse.cs                ← Success/Failure wrappers
│   ├── Services/
│   │   ├── AuthService.cs                ← Business logic (returns Result)
│   │   └── TokenService.cs               ← JWT generation
│   ├── DTOs/
│   │   └── Auth/
│   │       ├── LoginRequest.cs
│   │       ├── RegisterRequest.cs
│   │       └── TokenResponse.cs
│   └── Interfaces/
│       ├── IAuthService.cs               ← Service contract
│       └── ITokenService.cs
│
├── TicketStar.Domain/
│   ├── Entities/
│   │   ├── User.cs
│   │   ├── AuthIdentity.cs
│   │   ├── RefreshToken.cs
│   │   └── SecurityEvent.cs
│   ├── Enums/
│   │   └── ResultError.cs                ← Error type enum
│   └── Interfaces/
│       ├── IRepository.cs                ← Data access contract
│       ├── IPasswordHasher.cs            ← Security contract
│       └── ITokenHasher.cs
│
└── TicketStar.Infrastructure/
    ├── Data/
    │   ├── AppDbContext.cs               ← EF Core DbContext
    │   └── DbSeeder.cs
    ├── Repositories/
    │   └── Repository.cs                 ← Generic repo implementation
    ├── Security/
    │   ├── Argon2PasswordHasher.cs       ← Password hashing (OWASP 2025)
    │   ├── Sha256TokenHasher.cs          ← Token hashing
    │   └── CryptoRandomService.cs        ← Secure randomness
    └── ExternalServices/
        ├── GoogleAuthService.cs
        └── SepayService.cs
```

---

## Summary

The TicketStar backend combines three powerful patterns:

1. **Layered Architecture** — Separation of concerns (API → Application → Domain → Infrastructure)
2. **Result Pattern** — Business outcomes as values, not exceptions
3. **API Response Envelope** — Consistent JSON shape for all endpoints

Together, they create a **clean, maintainable, type-safe, and frontend-friendly API** that scales well as features are added.

