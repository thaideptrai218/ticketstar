# TicketStar Backend Codebase Summary

**Project:** TicketStar Event Ticketing Platform
**Tech Stack:** .NET 8 (C#), EF Core, ASP.NET Core, MySQL
**Architecture:** Layered (Domain → Application → Infrastructure → API)

## Project Overview

TicketStar is a modern event ticketing platform built with a clean, domain-driven architecture. The backend provides RESTful APIs for user authentication, event management, ticket sales, and payment processing.

## Architecture Layers

### 1. Domain Layer (`TicketStar.Domain`)

Core business logic and entity definitions independent of infrastructure.

**Entities:**

- `User` — User accounts with email, password hash, roles
- `Event` — Event details, capacity, dates, status
- `Ticket` — Individual tickets linked to events and orders
- `TicketType` — Ticket categories (VIP, General, Student, etc.)
- `Order` — Order header with customer, total, status
- `OrderItem` — Order line items (which tickets were ordered)
- `Payment` — Payment details with status and provider
- `RefreshToken` — JWT refresh tokens with expiry
- `MagicLink` — Passwordless authentication tokens
- `AuthIdentity` — OAuth identity links (Google, etc.)
- `AuthSession` — Active user sessions
- `SecurityEvent` — Audit log of security-related actions
- `UserProfile` — Extended user information
- `WebAuthnCredential` — Passkey/WebAuthn credentials
- `EmailChangeRequest` — Email change verification
- `StaffAssignment` — Staff roles for events
- `CheckIn` — Ticket check-in records

**Enums:**

- `UserRole` — Admin, Staff, Customer, Organizer
- `EventStatus` — Draft, Published, Cancelled, Completed
- `OrderStatus` — Pending, Paid, Cancelled, Refunded
- `PaymentStatus` — Pending, Completed, Failed, Refunded
- `SecurityEventType` — LoginAttempt, EmailChanged, PasswordReset, etc.
- `AuthProvider` — Email, Google, Apple, WebAuthn

**Interfaces (Contracts):**

- `IRepository<T>` — Generic data access contract
- `IUnitOfWork` — Transaction coordinator
- `IUserRepository` — User queries
- `IRefreshTokenRepository` — Token lifecycle management
- `IMagicLinkRepository` — Magic link verification
- `IAuthIdentityRepository` — OAuth identity queries
- `ISecurityEventRepository` — Audit log queries

### 2. Application Layer (`TicketStar.Application`)

Business logic services and application-level concerns (transport-agnostic).

**Services:**

- `AuthService` — Registration, login, passwordless auth
- `TokenService` — JWT generation and validation
- `SessionService` — User session management

**Security Services:**

- `Argon2PasswordHasher` — Password hashing with Argon2
- `Sha256TokenHasher` — Token hashing (for refresh tokens)
- `CryptoRandomService` — Secure random token generation

**Options (Configuration):**

- `JwtOptions` — JWT settings (secret, issuer, audience, expiry)
- `GoogleAuthOptions` — Google OAuth configuration

**Common Patterns:**

- `Result<T>` — Generic result type for operations returning data
- `Result` — Non-generic result type for void operations
- `ResultError` — Error classification (Validation, Unauthorized, Forbidden, NotFound, Conflict, Internal)
- `PaginatedRequest` — Offset-based pagination query
- `PaginatedResponse<T>` — Offset-based pagination response
- `CursorPaginatedRequest` — Cursor-based pagination query
- `CursorPaginatedResponse<T>` — Cursor-based pagination response

**DTOs:**

- Auth folder contains request/response DTOs for registration, login, token refresh

### 3. Infrastructure Layer (`TicketStar.Infrastructure`)

Data access and external service integrations.

**Database:**

- `AppDbContext` — EF Core DbContext with all entity mappings
- `Migrations` — Database schema migrations
- `Configurations` — Fluent API configurations for entities

**Repository Implementations:**

- `EfRepository<T>` — Generic EF Core repository implementation
- `EfUnitOfWork` — EF Core unit of work coordinator
- `UserRepository` — User-specific queries
- `RefreshTokenRepository` — Token lifecycle queries
- `MagicLinkRepository` — Magic link validation
- `AuthIdentityRepository` — OAuth identity lookups
- `SecurityEventRepository` — Audit log queries
- `AuthSessionRepository` — Session management

**Database Seeding:**

- `DbSeeder` — Initial data population for development

### 4. API Layer (`TicketStar.API`)

HTTP presentation layer and request/response handling.

**Controllers:**

- `ApiControllerBase` — Abstract base providing Result→HTTP mapping
- `AuthController` — Authentication endpoints (register, login, refresh, passwordless)

**Middleware:**

- `GlobalExceptionMiddleware` — Catch-all exception handler with JSON responses

**Models:**

- `ApiResponse<T>` — Typed response envelope with success/data/error/traceId
- `ApiResponse` — Message response envelope

**Extensions:**

- `ServiceCollectionExtensions` — DI registration methods:
    - `AddApplicationServices()` — Security & business services
    - `AddRepositories()` — Repository & UoW registration
    - `AddJwtAuthentication()` — JWT setup with validation
    - `AddSwaggerWithAuth()` — Swagger documentation
    - `AddRateLimiting()` — Rate limiter policies

**Startup:**

- `Program.cs` — ~65 lines: database config, service registration, pipeline setup

### 5. Tests (`TicketStar.Tests`)

Comprehensive unit and integration tests.

**Unit Tests:**

- `AuthServiceTests` — Registration, login, token generation
- `TokenServiceTests` — JWT creation and validation
- `SessionServiceTests` — Session lifecycle management
- Security tests:
    - `Argon2PasswordHasherTests` — Password hashing verification
    - `Sha256TokenHasherTests` — Token hashing consistency
    - `CryptoRandomServiceTests` — Random generation quality

**Integration Tests:**

- `DbContextTests` — Database connectivity and seeding
- `TestAppDbContext` — In-memory test database
- `TestDbContextFactory` — Factory for test context creation

## Key Design Patterns

### Result Pattern

Services return `Result<T>` instead of throwing exceptions:

```csharp
public async Task<Result<User>> RegisterAsync(string email, string password)
{
    if (email == null)
        return Result<User>.Failure("Email is required", ResultError.Validation);
    // ...
    return Result<User>.Success(user);
}
```

### Repository & Unit of Work

Clean data access abstraction:

```csharp
public async Task Register(string email, string password)
{
    var user = new User { Email = email, PasswordHash = Hash(password) };
    await _uow.Users.AddAsync(user);
    await _uow.SaveChangesAsync();
}
```

### Dependency Injection Extensions

Clean Program.cs:

```csharp
builder.Services.AddJwtAuthentication(config);
builder.Services.AddApplicationServices();
builder.Services.AddRepositories();
```

### Options Pattern

Type-safe configuration:

```csharp
services.AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .Validate(o => o.Secret.Length >= 32)
    .ValidateOnStart();
```

### API Response Envelope

Standardized JSON responses:

```json
{
    "success": true,
    "data": { "userId": "...", "accessToken": "..." },
    "error": null,
    "traceId": "0HN0IRFA4UKCJ:00000001"
}
```

### Health Checks

Container orchestration integration:

- `/health/live` — Liveness (API running)
- `/health/ready` — Readiness (MySQL connected)

## Authentication Flow

1. **Registration** → POST /api/auth/register
    - Hash password with Argon2
    - Create user and auth identity
    - Return 201 with JWT tokens

2. **Login** → POST /api/auth/login
    - Find user by email
    - Verify password with Argon2
    - Create refresh token
    - Return tokens

3. **Token Refresh** → POST /api/auth/refresh
    - Validate refresh token
    - Generate new access token
    - Return new JWT

4. **Passwordless (Magic Link)** → POST /api/auth/magic-link
    - Generate secure random token
    - Store in database with expiry
    - Email link to user
    - User clicks → exchanges token for JWT

## Error Handling Strategy

All errors mapped to HTTP status codes via Result pattern:

| Error        | HTTP Status | Scenario                       |
| ------------ | ----------- | ------------------------------ |
| Validation   | 400         | Invalid input                  |
| Unauthorized | 401         | Missing/invalid credentials    |
| Forbidden    | 403         | Insufficient permissions       |
| NotFound     | 404         | Resource not found             |
| Conflict     | 409         | Duplicate email, expired token |
| Internal     | 500         | Unhandled exception            |

## Database Schema

**Tables:**

- `Users` — User accounts
- `RefreshTokens` — JWT refresh tokens
- `MagicLinks` — Passwordless auth tokens
- `AuthIdentities` — OAuth provider links
- `AuthSessions` — Active user sessions
- `SecurityEvents` — Audit trail
- `Events` — Event details
- `Tickets` — Individual tickets
- `TicketTypes` — Ticket categories
- `Orders` — Order headers
- `OrderItems` — Order line items
- `Payments` — Payment records
- `UserProfiles` — Extended user info
- `WebAuthnCredentials` — Passkey credentials
- `EmailChangeRequests` — Email change verification
- `StaffAssignments` — Event staff roles
- `CheckIns` — Ticket check-in records

## Configuration

**appsettings.json:**

```json
{
    "ConnectionStrings": {
        "MySqlConnection": "Server=localhost;Database=ticketstar_dev;User=root;Password=..."
    },
    "Jwt": {
        "Secret": "...(at least 32 chars)...",
        "Issuer": "TicketStar",
        "Audience": "TicketStar.Frontend",
        "AccessTokenMinutes": 15,
        "RefreshTokenDays": 7
    },
    "GoogleAuth": {
        "ClientId": "...",
        "ClientSecret": "..."
    }
}
```

## Development Setup

```bash
# Prerequisites: .NET 8 SDK, MySQL

# Restore packages
dotnet restore

# Run database migrations
dotnet ef database update

# Run application
dotnet run --project src/TicketStar.API

# Run tests
dotnet test

# Watch mode
dotnet watch run --project src/TicketStar.API
```

## API Endpoints (Core)

### Authentication

- `POST /api/auth/register` — Register new account
- `POST /api/auth/login` — Login with credentials
- `POST /api/auth/refresh` — Refresh JWT token
- `POST /api/auth/magic-link` — Request passwordless link
- `POST /api/auth/magic-link/verify` — Verify magic link token
- `POST /api/auth/logout` — Logout (invalidate refresh token)

### Health

- `GET /health/live` — Liveness probe
- `GET /health/ready` — Readiness probe

## Testing Strategy

**Unit Tests:**

- Security services (hashing, token generation)
- Business services (auth, token validation)
- Repository pattern

**Integration Tests:**

- Database seeding and queries
- Full authentication flows

**Coverage:**

- Happy paths (successful registration, login)
- Error scenarios (duplicate email, invalid password)
- Edge cases (expired tokens, null inputs)

**Running Tests:**

```bash
dotnet test
dotnet test --filter "Category=Unit"
dotnet test --filter "Category=Integration"
```

## Code Standards

- **File size:** Keep under 200 lines for optimal context
- **Naming:** kebab-case for file names, PascalCase for classes/methods
- **Error handling:** Use Result pattern, avoid exceptions for control flow
- **DI:** Register all services via extension methods
- **Configuration:** Use Options pattern with validation
- **Comments:** Document complex logic, not obvious code
- **Tests:** Write for business logic, not infrastructure

## Performance Considerations

- **JWT:** 15-minute access token reduces refresh token exposure
- **Password hashing:** Argon2 with default iterations (expensive intentional)
- **Rate limiting:** 5 magic link requests per IP per 15 minutes
- **Health checks:** Database check only on /health/ready (not /health/live)
- **Pagination:** Support both offset and cursor-based strategies

## Security Practices

- ✅ Password hashing with Argon2
- ✅ JWT with HMAC-SHA256
- ✅ Refresh token hashing (not stored plaintext)
- ✅ Rate limiting on auth endpoints
- ✅ Security event logging (audit trail)
- ✅ CORS configured for frontend origin
- ✅ WebAuthn/passkey support
- ✅ Email verification for password changes
- ✅ Secure random token generation (crypto)

## Future Enhancements

1. **Event Management** — Create, edit, publish events
2. **Ticket Sales** — Sell tickets, manage inventory
3. **Payments** — Stripe integration for payments
4. **Admin Dashboard** — Event analytics and management
5. **Notifications** — Email and push notifications
6. **Search** — Elasticsearch for event search
7. **Analytics** — Event attendance and revenue tracking
8. **Mobile API** — Native mobile app support

## File Structure Summary

```
src/
├── TicketStar.Domain/               (~800 LOC)
│   ├── Entities/                    (15 entity files)
│   ├── Enums/                       (6 enum files)
│   └── Interfaces/                  (6 interface files)
├── TicketStar.Application/          (~1500 LOC)
│   ├── Services/                    (3 service implementations)
│   ├── Interfaces/                  (3 service interfaces)
│   ├── Common/                      (Result, Pagination)
│   ├── DTOs/                        (Request/response types)
│   └── Options/                     (Configuration)
├── TicketStar.Infrastructure/       (~2000 LOC)
│   ├── Repositories/                (8 repository implementations)
│   └── Data/                        (DbContext, migrations, seeding)
└── TicketStar.API/                  (~600 LOC)
    ├── Controllers/                 (1 API base + auth controller)
    ├── Middleware/                  (Exception handler)
    ├── Extensions/                  (DI setup)
    ├── Models/                      (Response envelopes)
    └── Program.cs                   (~65 lines)

tests/
└── TicketStar.Tests/                (~1500 LOC)
    ├── Unit/                        (Service & security tests)
    ├── Integration/                 (Database tests)
    └── Helpers/                     (Test context factories)
```

## Metrics

- **Total C# files:** ~70 source files + ~10 test files
- **Total lines of code:** ~8000 LOC (excluding migrations & generated code)
- **Test coverage:** Core auth flows (70%+)
- **Architecture:** Clean layered design with clear dependencies
- **Code quality:** No style warnings, syntax validated

---

**Last Updated:** 2026-02-27
**Maintained By:** Development Team
**Repository:** /home/welterial/projects/ticketstar/backend
