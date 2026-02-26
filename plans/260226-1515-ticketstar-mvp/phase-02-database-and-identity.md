# Phase 2 — Database & Identity

## Context Links

- [Plan Overview](plan.md) | [Phase 1](phase-01-project-scaffolding.md)
- [Backend Research](research/researcher-01-backend.md)

## Overview

- **Priority:** P1 | **Status:** completed | **Effort:** 10h
- **Depends on:** Phase 1
- EF Core with MySQL, ASP.NET Identity, JWT auth with refresh token rotation, OAuth Google + Magic Link

## Key Insights

- ASP.NET Identity manages users/roles; extend `IdentityUser` with custom fields
- JWT access token (15min) + refresh token (7d) with rotation
- OAuth via Google external login; Magic Link via emailed one-time token
- 4 roles: Admin, Organizer, Staff, Attendee
- Staff assignment is per-event (StaffAssignments table)
- `QrCode` stores HMAC-signed payload for verification; raw payload (`ticketId|eventId|userId|timestamp`) derived by stripping signature — no separate `QrData` field needed
- All money columns use `decimal(12,0)` — VND has no fractional currency units
- `CreatedAt` on all entities, `UpdatedAt` on mutable entities (Event, Order, TicketType, Payment)
- `RefreshToken.ReplacedByToken` required for reuse detection chain

## Requirements

- All entity models defined with EF Core Fluent API
- Initial migration creates full schema
- JWT authentication pipeline configured
- Refresh token rotation endpoint
- Google OAuth flow
- Magic Link (email one-time code/token)
- Role seeding on first run

## Architecture

### Entity Models (Domain project)

```
Domain/Entities/
├── ApplicationUser.cs      # extends IdentityUser: FullName, AvatarUrl, IsLocked, CreatedAt
├── Event.cs                # Id, OrganizerId, Title, Description, StartAt, EndAt, Venue, Status, ImageUrl, Slug, CreatedAt, UpdatedAt
├── TicketType.cs           # Id, EventId, Name, Price, Quota, SoldCount, SaleStartAt, SaleEndAt, CreatedAt
├── Order.cs                # Id, UserId, Status, TotalAmount, ExpiresAt, CreatedAt, UpdatedAt, PaidAt
├── OrderItem.cs            # Id, OrderId, TicketTypeId, Quantity, UnitPrice, CreatedAt
├── Ticket.cs               # Id, OrderItemId, UserId, EventId, TicketTypeId, QrCode, IsCheckedIn, CreatedAt
├── CheckIn.cs              # Id, TicketId, ScannedBy, ScannedAt, EventId
├── Payment.cs              # Id, OrderId, Provider, ExternalRef, Amount, Status, CreatedAt, ProcessedAt
├── RefreshToken.cs         # Id, UserId, Token, ExpiresAt, CreatedAt, RevokedAt, ReplacedByToken
├── StaffAssignment.cs      # Id, UserId, EventId, AssignedBy, AssignedAt
└── MagicLinkToken.cs       # Id, UserId, Token, ExpiresAt, IsUsed, CreatedAt

Domain/Enums/
├── EventStatus.cs          # Draft, Published, Cancelled
├── OrderStatus.cs          # Pending, Paid, Cancelled, Expired
└── PaymentStatus.cs        # Pending, Success, Failed
```

### DbContext (Infrastructure project)

```
Infrastructure/Data/
├── AppDbContext.cs          # DbSets, OnModelCreating (Fluent API)
├── Configurations/
│   ├── EventConfiguration.cs
│   ├── TicketTypeConfiguration.cs
│   ├── OrderConfiguration.cs
│   ├── OrderItemConfiguration.cs
│   ├── TicketConfiguration.cs
│   ├── CheckInConfiguration.cs
│   ├── PaymentConfiguration.cs
│   ├── RefreshTokenConfiguration.cs
│   ├── StaffAssignmentConfiguration.cs
│   └── MagicLinkTokenConfiguration.cs
└── Migrations/
```

## Related Code Files

**Create:**

- `backend/src/TicketStar.Domain/Entities/*.cs` — all entity models above
- `backend/src/TicketStar.Domain/Enums/*.cs` — all enums above
- `backend/src/TicketStar.Infrastructure/Data/AppDbContext.cs`
- `backend/src/TicketStar.Infrastructure/Data/Configurations/*.cs` — EF configs
- `backend/src/TicketStar.Infrastructure/Data/DbSeeder.cs` — seed roles + admin user
- `backend/src/TicketStar.Application/DTOs/Auth/` — LoginRequest, TokenResponse, RefreshRequest, MagicLinkRequest, GoogleLoginRequest
- `backend/src/TicketStar.Application/Interfaces/IAuthService.cs`
- `backend/src/TicketStar.Application/Interfaces/ITokenService.cs`
- `backend/src/TicketStar.Application/Services/AuthService.cs`
- `backend/src/TicketStar.Application/Services/TokenService.cs`
- `backend/src/TicketStar.Application/Services/MagicLinkService.cs`
- `backend/src/TicketStar.API/Controllers/AuthController.cs`

**Modify:**

- `backend/src/TicketStar.API/Program.cs` — add Identity, JWT, EF Core, auth pipeline
- `backend/src/TicketStar.API/appsettings.json` — JWT settings, Google OAuth client ID

## Implementation Steps

### 1. Entity Models

1. Create all entities in `Domain/Entities/` with properties matching schema from research
2. Create enums in `Domain/Enums/`
3. `ApplicationUser : IdentityUser` with: `FullName`, `AvatarUrl`, `IsLocked`, `CreatedAt`
4. Navigation properties: Event.Organizer, Order.User, Ticket.Event, etc.
5. QR: `QrCode` field only (HMAC-signed payload string) — generate QR image on-the-fly via API, no `QrData` blob storage
6. `RefreshToken`: include `ReplacedByToken` (nullable string) for rotation chain tracking

### 2. EF Core Configuration

1. Create `AppDbContext : IdentityDbContext<ApplicationUser>`
2. Register all DbSets
3. Create `IEntityTypeConfiguration<T>` for each entity:
    - Indexes: `Orders(Status, ExpiresAt)`, `Tickets(QrCode)` unique, `Events(Status, StartAt)`, `Events(Slug)` unique, `Events(OrganizerId)`, `TicketTypes(EventId)`, `CheckIns(EventId, TicketId)`, `Payments(OrderId)` unique, `RefreshTokens(UserId)`, `MagicLinkTokens(Token)` unique
    - Relationships: cascade deletes where appropriate (Event→TicketTypes), restrict others
    - Column types: `decimal(12,0)` for money (VND has no fractional units), `varchar(450)` for user FKs
    - `CreatedAt` on all entities (DB default `NOW()`), `UpdatedAt` on mutable entities (Event, Order, TicketType, Payment) via EF `SaveChanges` override
4. Register in `Program.cs`:
    ```csharp
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));
    ```

### 3. Identity + JWT Setup

1. Register Identity:
    ```csharp
    builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders();
    ```
2. Configure JWT Bearer:
    - Issuer, Audience, SecretKey from config
    - TokenValidationParameters: validate issuer, audience, lifetime, signing key
    - 15min access token expiry
3. Create `ITokenService` / `TokenService`:
    - `GenerateAccessToken(user, roles)` — JWT with claims: sub, email, roles, jti
    - `GenerateRefreshToken()` — random 64-byte base64
    - `ValidateRefreshToken(token)` — check DB, not expired, not revoked

### 4. Auth Endpoints (AuthController)

1. `POST /api/auth/google-login` — validate Google ID token, find-or-create user, return tokens
2. `POST /api/auth/magic-link/request` — generate token, save to DB, publish email event via MassTransit
3. `POST /api/auth/magic-link/verify` — validate token, mark used, return JWT tokens
4. `POST /api/auth/refresh` — validate refresh token, rotate (revoke old, issue new pair)
5. `POST /api/auth/logout` — revoke refresh token

### 5. Refresh Token Rotation

- On refresh: revoke current token, issue new access + refresh pair
- If reuse of revoked token detected → revoke all user tokens (potential theft)
- Store in `RefreshTokens` table: Token (hashed), ExpiresAt, RevokedAt, ReplacedByToken

### 6. Role Seeding

1. Create `DbSeeder` class
2. On app startup: ensure roles exist (Admin, Organizer, Staff, Attendee)
3. Create default admin user if none exists (email from config)

### 7. Migration

1. `dotnet ef migrations add InitialCreate -p src/TicketStar.Infrastructure -s src/TicketStar.API`
2. `dotnet ef database update -s src/TicketStar.API`

## Todo List

- [x] Create all entity models
- [x] Create all enums
- [x] Create AppDbContext with Fluent API configs
- [x] Create initial migration
- [x] Configure Identity in Program.cs
- [x] Configure JWT Bearer authentication
- [x] Implement TokenService (access + refresh token generation)
- [x] Implement refresh token rotation with reuse detection
- [x] Implement Google OAuth login endpoint
- [x] Implement Magic Link request + verify endpoints
- [x] Create DbSeeder for roles + admin
- [x] Create auth DTOs
- [x] Create AuthController
- [x] Test: migration applies cleanly
- [x] Test: register + login flow returns JWT

## Success Criteria

- Migration creates all tables in MySQL
- Google OAuth login returns access + refresh tokens
- Magic Link request creates token in DB, verify returns JWT
- Refresh endpoint rotates tokens correctly
- Reused revoked token triggers full revocation
- Roles seeded on startup

## Risk Assessment

- **Google OAuth in dev:** ✅ Use real Google Cloud credentials from day 1 — set up project before starting Phase 2
- **Magic Link without real email:** ✅ Log token to console (MassTransit consumer stubs), no email infra needed
- **Token rotation complexity:** keep state machine simple, test edge cases

## Security Considerations

<!-- Updated: Validation Session 4 - hashing algo, Google lib, rate limit strategy confirmed -->
- Refresh tokens stored **SHA-256 hashed** in DB (hash before save, compare hash on lookup)
- Magic link tokens expire in 10min, single-use
- JWT secret key min 256-bit; stored in `appsettings.Development.json` (gitignored)
- Google ID token validated via `Google.Apis.Auth` → `GoogleJsonWebSignature.ValidateAsync()`
  - Requires real Google Cloud OAuth credentials configured before Phase 2 starts
- Rate limit magic link endpoint with ASP.NET Core built-in `RateLimiter` (fixed window, per-IP)

## Next Steps

- Phase 3: Build all API endpoints on top of this auth + data layer
