# TicketStar Backend - System Architecture

## Architecture Overview

TicketStar backend follows a **clean layered architecture** with separation of concerns, enabling testability, maintainability, and independent layer evolution.

```
┌────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │           HTTP Layer (Controllers)               │ │
│  │  • ApiControllerBase (Result → HTTP mapping)    │ │
│  │  • AuthController (Register, Login, Refresh)    │ │
│  │  • GlobalExceptionMiddleware (Catch-all errors) │ │
│  └──────────────────────────────────────────────────┘ │
│                         ↓                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │      Application Layer (Business Logic)         │ │
│  │  • AuthService, TokenService, SessionService    │ │
│  │  • Security (Hashing, Token Gen, Random)        │ │
│  │  • Pagination, Result Types                     │ │
│  └──────────────────────────────────────────────────┘ │
│                         ↓                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │    Infrastructure Layer (Data Access)           │ │
│  │  • EfRepository<T> (Generic CRUD)               │ │
│  │  • Entity-specific Repositories                 │ │
│  │  • EfUnitOfWork (Transaction Manager)           │ │
│  │  • EF Core DbContext                            │ │
│  └──────────────────────────────────────────────────┘ │
│                         ↓                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │      Domain Layer (Business Rules)              │ │
│  │  • Entities (User, Event, Ticket, Order, etc.)  │ │
│  │  • Enums (UserRole, OrderStatus, etc.)          │ │
│  │  • Repository Interfaces (Contracts)            │ │
│  └──────────────────────────────────────────────────┘ │
│                         ↓                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │            MySQL Database                        │ │
│  │  • User Management (Users, AuthIdentities)      │ │
│  │  • Authentication (RefreshTokens, MagicLinks)   │ │
│  │  • Events & Tickets                             │ │
│  │  • Orders & Payments                            │ │
│  │  • Audit Trail (SecurityEvents)                 │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. Domain Layer (Business Rules)

**Location:** `TicketStar.Domain/`

**Purpose:** Define business entities, rules, and contracts independent of infrastructure.

**Contents:**

**Entities (15 total):**

- `User` — User account with email, password hash, roles
- `Event` — Event details (name, date, location, capacity)
- `Ticket` — Individual ticket (unique code, status, type)
- `TicketType` — Ticket category (VIP, General, Student)
- `Order` — Order header (customer, total, status, date)
- `OrderItem` — Line items (tickets in order)
- `Payment` — Payment record (amount, provider, status)
- `RefreshToken` — JWT refresh token (expires after 7 days)
- `MagicLink` — Passwordless auth link (expires after 15 min)
- `AuthIdentity` — OAuth provider link (Google, Apple, WebAuthn)
- `AuthSession` — Active user session
- `SecurityEvent` — Audit log entry
- `UserProfile` — Extended user info
- `WebAuthnCredential` — Passkey credential
- `EmailChangeRequest` — Email change verification
- `StaffAssignment` — Staff roles for events
- `CheckIn` — Ticket check-in record

**Enums (6 total):**

- `UserRole` — Admin, Staff, Customer, Organizer
- `EventStatus` — Draft, Published, Cancelled, Completed
- `OrderStatus` — Pending, Paid, Cancelled, Refunded
- `PaymentStatus` — Pending, Completed, Failed, Refunded
- `SecurityEventType` — LoginAttempt, EmailChanged, etc.
- `AuthProvider` — Email, Google, Apple, WebAuthn

**Interfaces:**

- `IRepository<T>` — Generic data access contract
- `IUnitOfWork` — Transaction coordinator
- `IUserRepository` — User-specific queries
- `IRefreshTokenRepository` — Token queries
- `IMagicLinkRepository` — Magic link queries
- `IAuthIdentityRepository` — OAuth queries
- `ISecurityEventRepository` — Audit log queries

**Key Characteristics:**

- ❌ No dependencies on other projects
- ❌ No HTTP, database, or framework references
- ✅ Pure C# with business logic
- ✅ Interfaces for all data dependencies

---

### 2. Application Layer (Business Logic)

**Location:** `TicketStar.Application/`

**Purpose:** Implement business logic, orchestrate entities, coordinate with infrastructure.

**Contents:**

**Services (3 core + security):**

1. **AuthService** — Registration, login, passwordless auth
    - RegisterAsync(email, password)
    - LoginAsync(email, password)
    - RequestMagicLinkAsync(email)
    - VerifyMagicLinkAsync(token)
    - LogoutAsync(userId)

2. **TokenService** — JWT generation and validation
    - GenerateAccessTokenAsync(userId)
    - GenerateRefreshTokenAsync(userId)
    - ValidateTokenAsync(token)
    - RefreshAccessTokenAsync(refreshToken)

3. **SessionService** — User session management
    - CreateSessionAsync(userId, ipAddress)
    - EndSessionAsync(sessionId)
    - GetActiveSessionsAsync(userId)
    - InvalidateRefreshTokenAsync(tokenId)

**Security Services:**

- `Argon2PasswordHasher` — Password hashing
- `Sha256TokenHasher` — Token hashing (for refresh tokens)
- `CryptoRandomService` — Secure random generation

**Common Patterns:**

1. **Result<T>** — Typed result for operations

    ```csharp
    public class Result<T>
    {
        public bool IsSuccess { get; }
        public T? Value { get; }
        public string? Error { get; }
        public ResultError? ErrorType { get; }
    }
    ```

2. **ResultError** — Error classification

    ```csharp
    public enum ResultError
    {
        Validation,     // 400
        Unauthorized,   // 401
        Forbidden,      // 403
        NotFound,       // 404
        Conflict,       // 409
        Internal        // 500
    }
    ```

3. **Pagination Support:**
    - `PaginatedRequest` / `PaginatedResponse<T>` (offset-based)
    - `CursorPaginatedRequest` / `CursorPaginatedResponse<T>` (cursor-based)

**Configuration:**

- `JwtOptions` — JWT settings with validation
- `GoogleAuthOptions` — Google OAuth config

**Key Characteristics:**

- ✅ Depends only on Domain
- ❌ No HTTP or database references
- ✅ Transport-agnostic (could use gRPC, messaging, etc.)
- ✅ Business logic concentrated here
- ✅ Easy to unit test

---

### 3. Infrastructure Layer (Data Access)

**Location:** `TicketStar.Infrastructure/`

**Purpose:** Implement data persistence, external integrations, technical concerns.

**Contents:**

**Repository Pattern:**

1. **Generic Repository** (`EfRepository<T>`)

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

2. **Entity-Specific Repositories:**
    - `UserRepository` → Find by email, claim
    - `RefreshTokenRepository` → Find by token hash, user
    - `MagicLinkRepository` → Find by token, verify
    - `AuthIdentityRepository` → Find by provider
    - `SecurityEventRepository` → Query events by type

3. **Unit of Work** (`EfUnitOfWork`)
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

**Database:**

- `AppDbContext` — EF Core DbContext with all entity mappings
- Fluent API configurations for relationships
- Database seeding via `DbSeeder`

**Migrations:**

- Auto-managed via EF Core
- Version control via migration files

**Key Characteristics:**

- ✅ Depends on Domain & Application
- ✅ Implements interfaces defined in Domain
- ✅ Handles database concerns (transactions, queries)
- ✅ Easy to swap implementations (EF → Dapper, SQL Server → PostgreSQL)
- ✅ No business logic

---

### 4. API Layer (HTTP Presentation)

**Location:** `TicketStar.API/`

**Purpose:** Handle HTTP requests/responses, map to application services, manage middleware.

**Contents:**

**Controllers:**

- `ApiControllerBase` — Base class for all controllers
    - `FromResult<T>()` → 200 OK or error status
    - `FromResult()` → 200 OK or error status (void operation)
    - `CreatedFromResult<T>()` → 201 Created or error status

- `AuthController` — Authentication endpoints
    - POST /api/auth/register
    - POST /api/auth/login
    - POST /api/auth/refresh
    - POST /api/auth/magic-link
    - POST /api/auth/magic-link/verify
    - POST /api/auth/logout

**Middleware:**

- `GlobalExceptionMiddleware` — Catch-all exception handler
    - Logs exceptions
    - Returns JSON (not HTML)
    - Includes TraceId for debugging

**Models:**

- `ApiResponse<T>` — Typed response envelope
- `ApiResponse` — Message response envelope

**Startup Setup:**

- `Program.cs` (~65 lines, clean)
- `ServiceCollectionExtensions.cs` — DI registration

**Extension Methods:**

- `AddApplicationServices()` — Security & business services
- `AddRepositories()` — UoW & repositories
- `AddJwtAuthentication()` — JWT bearer + options validation
- `AddSwaggerWithAuth()` — Swagger documentation
- `AddRateLimiting()` — Rate limiting policies

**Key Characteristics:**

- ✅ Depends on all layers
- ✅ Minimal business logic
- ✅ Maps HTTP to application concerns
- ✅ Handles cross-cutting concerns (logging, auth, CORS)
- ✅ Returns consistent JSON responses

---

## Data Flow

### Authentication Flow (Registration)

```
1. Client → POST /api/auth/register (email, password)
                    ↓
2. AuthController.Register()
   - Validate input (email format, password strength)
   - Call AuthService.RegisterAsync()
                    ↓
3. AuthService.RegisterAsync()
   - Check if email exists (via IUserRepository)
   - Hash password with Argon2
   - Create User entity
   - Create AuthIdentity for email provider
                    ↓
4. Save to database
   - UnitOfWork.Users.AddAsync(user)
   - UnitOfWork.AuthIdentities.AddAsync(identity)
   - UnitOfWork.SaveChangesAsync() (single transaction)
                    ↓
5. Return Result<AuthResponse>
   - AccessToken (15 minutes)
   - RefreshToken (7 days, hashed)
   - User info
                    ↓
6. ApiControllerBase.CreatedFromResult()
   - Map Result to 201 Created response
   - Include Location header
   - Add TraceId for correlation
                    ↓
7. Client ← 201 Created + JWT tokens
```

### Token Refresh Flow

```
1. Client → POST /api/auth/refresh (refreshToken)
                    ↓
2. AuthController.Refresh()
   - Validate input
   - Call TokenService.RefreshAccessTokenAsync()
                    ↓
3. TokenService.RefreshAccessTokenAsync()
   - Hash refresh token
   - Query RefreshTokenRepository
   - Verify not expired
   - Verify not revoked
   - Generate new access token
   - Optionally rotate refresh token
                    ↓
4. Return new accessToken
                    ↓
5. Client ← 200 OK + new JWT
```

### Request Handling with Middleware

```
1. HTTP Request arrives
                ↓
2. GlobalExceptionMiddleware (outer try-catch)
                ↓
3. Authentication middleware (JWT validation)
                ↓
4. Authorization middleware (role checks)
                ↓
5. Rate limiting middleware (IP-based limits)
                ↓
6. Controller action executes
                ↓
7. If exception: caught by GlobalExceptionMiddleware
   - Log error
   - Return 500 + JSON
                ↓
8. If success: Return JSON via FromResult()
                ↓
9. Response sent to client
```

---

## Database Schema

### Core Authentication Tables

**Users**

```
UserId (PK)
Email (UNIQUE)
PasswordHash
FirstName
LastName
Role (Admin, Staff, Customer, Organizer)
IsEmailVerified
IsActive
CreatedAt
UpdatedAt
DeletedAt (soft delete)
```

**RefreshTokens**

```
TokenId (PK)
UserId (FK)
TokenHash (NOT plaintext)
ExpiresAt
RevokedAt (null = valid)
CreatedAt
```

**MagicLinks**

```
LinkId (PK)
UserId (FK)
TokenHash (NOT plaintext)
ExpiresAt
UsedAt (null = unused)
CreatedAt
```

**AuthIdentities**

```
IdentityId (PK)
UserId (FK)
Provider (Email, Google, Apple, WebAuthn)
ProviderUserId (OAuth ID)
CreatedAt
```

**AuthSessions**

```
SessionId (PK)
UserId (FK)
IpAddress
UserAgent
ExpiresAt
CreatedAt
```

**SecurityEvents**

```
EventId (PK)
UserId (FK)
EventType (LoginAttempt, EmailChanged, etc.)
Details (JSON)
IpAddress
CreatedAt
```

### Event Management Tables (Phase 3+)

**Events**

```
EventId (PK)
OrganizerId (FK → Users)
Name
Description
Status (Draft, Published, Cancelled)
StartDate
EndDate
Location
Capacity
CreatedAt
UpdatedAt
DeletedAt
```

**TicketTypes**

```
TypeId (PK)
EventId (FK)
Name (VIP, General, Student)
Price
Quantity
Available
Sold
CreatedAt
```

**Tickets**

```
TicketId (PK)
EventId (FK)
TypeId (FK)
Code (UNIQUE)
Status (Available, Sold, Checked In)
CreatedAt
```

**Orders** (Phase 5+)

```
OrderId (PK)
UserId (FK)
EventId (FK)
Total
Status (Pending, Paid, Cancelled)
CreatedAt
```

**Payments** (Phase 6+)

```
PaymentId (PK)
OrderId (FK)
Amount
Provider (Stripe, etc.)
Status (Pending, Completed, Failed)
ProviderTransactionId
CreatedAt
```

---

## Dependency Injection Setup

```csharp
// Program.cs
builder.Services
    // Configuration
    .AddOptions<JwtOptions>()
        .BindConfiguration(JwtOptions.SectionName)
        .ValidateOnStart()

    // Database
    .AddDbContext<AppDbContext>(...)

    // Services (via extensions)
    .AddApplicationServices()      // Auth, Token, Session
    .AddRepositories()             // UoW + Repositories
    .AddJwtAuthentication(config)  // JWT bearer + options

    // Middleware setup
    .AddSwaggerWithAuth()
    .AddRateLimiting()
    .AddHealthChecks()
        .AddMySql(connStr, "mysql")
        .AddCheck("self", () => HealthCheckResult.Healthy());
```

**Lifetimes:**

- **Singleton:** Security services (Argon2Hasher, TokenHasher, CryptoRandom)
- **Scoped:** Services, Repositories, DbContext (per-request isolation)
- **Transient:** Rarely used; avoid

---

## Error Handling Strategy

### Mapping ResultError → HTTP Status

```csharp
ResultError.Validation    → 400 Bad Request      (input validation failed)
ResultError.Unauthorized  → 401 Unauthorized     (missing/invalid credentials)
ResultError.Forbidden     → 403 Forbidden        (insufficient permissions)
ResultError.NotFound      → 404 Not Found        (resource not found)
ResultError.Conflict      → 409 Conflict         (duplicate, expired token)
ResultError.Internal      → 500 Internal Server  (unhandled exception)
```

### Response Format

**Success (200 OK):**

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "traceId": "0HN0IRFA4UKCJ:00000001"
}
```

**Error (400/401/409/500):**

```json
{
    "success": false,
    "data": null,
    "error": "Email already registered",
    "traceId": "0HN0IRFA4UKCJ:00000001"
}
```

---

## Authentication & Security

### JWT Token Structure

**Access Token (15 minutes):**

- Claim: `sub` (user ID)
- Claim: `email` (user email)
- Claim: `role` (user role)
- Signed with HS256 (HMAC-SHA256)

**Refresh Token (7 days):**

- Stored hashed in database (NOT plaintext)
- Can be revoked if compromised
- Rotated on use (generate new refresh token with new access token)

### Password Security

- **Algorithm:** Argon2id (memory-hard, resistant to GPU attacks)
- **Default:** 2 passes, 19 MB memory
- **Salt:** Automatically included

### Token Security

- **Refresh Token Hashing:** SHA256 (not stored plaintext)
- **Magic Link Security:** Crypto.Random (cryptographically secure)
- **Rate Limiting:** 5 magic link requests per IP per 15 minutes

### Attack Prevention

| Attack        | Defense                                       |
| ------------- | --------------------------------------------- |
| Brute force   | Rate limiting, strong password requirements   |
| SQL Injection | Parameterized queries (EF Core)               |
| Token forgery | HMAC-SHA256 signature                         |
| Token theft   | Short expiry (15 min), refresh token rotation |
| CSRF          | SameSite cookies, CORS validation             |
| XSS           | HttpOnly cookies (future), CSP headers        |

---

## Scalability Considerations

### Current Design (Phase 1-2)

- **Stateless APIs** — Can scale horizontally with load balancer
- **Connection pooling** — EF Core handles connection management
- **In-process caching** — Not yet implemented

### Phase 3+ Scalability

- **Distributed caching** — Redis for tokens, user sessions
- **Read replicas** — MySQL read-only replicas for queries
- **Asynchronous processing** — Message queues for emails, notifications
- **Database sharding** — By event ID for large event volumes
- **Search indexing** — Elasticsearch for event search

### Bottlenecks to Monitor

1. **Database connections** — Scale via connection pooling
2. **Password hashing** — Intentionally slow; consider async hashing
3. **Token validation** — Currently O(1); no caching needed yet
4. **Email sending** — Async queue (Phase 7)

---

## Monitoring & Observability

### Health Checks

```
GET /health/live  → 200 if API running (liveness probe)
GET /health/ready → 200 if MySQL connected (readiness probe)
```

### Logging

- **Level:** Info, Warning, Error, Fatal
- **Correlation:** TraceId per request
- **Context:** Request path, method, status code, duration

### Metrics (Future)

- Request count by endpoint
- Response time histogram
- Error rate by type
- Database query times
- Authentication success/failure rate

### Tracing (Future)

- OpenTelemetry for distributed tracing
- Jaeger or DataDog for visualization

---

## Deployment Architecture

```
┌─────────────────────────┐
│   Frontend              │ (React, deployed to CDN)
│   (http://localhost:3001)
└──────────┬──────────────┘
           │ HTTP/HTTPS
           ↓
┌─────────────────────────┐
│   API Gateway / LB      │ (AWS ALB, nginx)
│   Rate limiting         │
│   SSL/TLS               │
└──────────┬──────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│   TicketStar API (Containerized)    │ (Docker)
│   Port: 8080                        │
│   Multiple instances for HA         │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────┐
│   MySQL Database        │ (AWS RDS)
│   Primary + Read Replica
│   Automated backups     │
└─────────────────────────┘
```

---

## Conclusion

TicketStar backend uses clean layered architecture with:

- ✅ Clear separation of concerns
- ✅ Testability at every layer
- ✅ Transport-agnostic business logic
- ✅ Standard .NET patterns (DI, Options, Repository)
- ✅ Security-first approach
- ✅ Scalable foundation for future growth

**Next Steps:** Complete Phase 3 (Event Management) following this architectural pattern.
