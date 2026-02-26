# Phase 2 — Database & Identity

## Context Links
- [Plan Overview](plan.md) | [Phase 1](phase-01-project-scaffolding.md)
- [Backend Research](research/researcher-01-backend.md)

## Overview
- **Priority:** P1 | **Status:** pending | **Effort:** 10h
- **Depends on:** Phase 1
- EF Core with MySQL, ASP.NET Identity, JWT auth with refresh token rotation, OAuth Google + Magic Link

## Key Insights
- ASP.NET Identity manages users/roles; extend `IdentityUser` with custom fields
- JWT access token (15min) + refresh token (7d) with rotation
- OAuth via Google external login; Magic Link via emailed one-time token
- 4 roles: Admin, Organizer, Staff, Attendee
- Staff assignment is per-event (StaffAssignments table)

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
├── ApplicationUser.cs      # extends IdentityUser: FullName, AvatarUrl, IsLocked
├── Event.cs                # Id, OrganizerId, Title, Description, StartAt, EndAt, Venue, Status, ImageUrl, Slug
├── TicketType.cs           # Id, EventId, Name, Price, Quota, SoldCount, SaleStartAt, SaleEndAt
├── Order.cs                # Id, UserId, Status, TotalAmount, ExpiresAt, CreatedAt, PaidAt
├── OrderItem.cs            # Id, OrderId, TicketTypeId, Quantity, UnitPrice
├── Ticket.cs               # Id, OrderItemId, UserId, EventId, TicketTypeId, QrCode, QrData, IsCheckedIn
├── CheckIn.cs              # Id, TicketId, ScannedBy, ScannedAt, EventId
├── Payment.cs              # Id, OrderId, Provider, ExternalRef, Amount, Status, ProcessedAt
├── RefreshToken.cs         # Id, UserId, Token, ExpiresAt, CreatedAt, RevokedAt
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

### 2. EF Core Configuration
1. Create `AppDbContext : IdentityDbContext<ApplicationUser>`
2. Register all DbSets
3. Create `IEntityTypeConfiguration<T>` for each entity:
   - Indexes: `Orders(Status, ExpiresAt)`, `Tickets(QrCode)` unique, `Events(Status, StartAt)`, `TicketTypes(EventId)`
   - Relationships: cascade deletes where appropriate (Event→TicketTypes), restrict others
   - Column types: `decimal(10,2)` for money, `varchar(450)` for user FKs
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
- [ ] Create all entity models
- [ ] Create all enums
- [ ] Create AppDbContext with Fluent API configs
- [ ] Create initial migration
- [ ] Configure Identity in Program.cs
- [ ] Configure JWT Bearer authentication
- [ ] Implement TokenService (access + refresh token generation)
- [ ] Implement refresh token rotation with reuse detection
- [ ] Implement Google OAuth login endpoint
- [ ] Implement Magic Link request + verify endpoints
- [ ] Create DbSeeder for roles + admin
- [ ] Create auth DTOs
- [ ] Create AuthController
- [ ] Test: migration applies cleanly
- [ ] Test: register + login flow returns JWT

## Success Criteria
- Migration creates all tables in MySQL
- Google OAuth login returns access + refresh tokens
- Magic Link request creates token in DB, verify returns JWT
- Refresh endpoint rotates tokens correctly
- Reused revoked token triggers full revocation
- Roles seeded on startup

## Risk Assessment
- **Google OAuth in dev:** need valid Google Cloud project + OAuth credentials
- **Magic Link without real email:** stub via MassTransit consumer logging to console
- **Token rotation complexity:** keep state machine simple, test edge cases

## Security Considerations
- Refresh tokens stored hashed in DB
- Magic link tokens expire in 10min, single-use
- JWT secret key min 256-bit
- Google ID token validated server-side via Google APIs
- Rate limit magic link requests (1 per email per minute)

## Next Steps
- Phase 3: Build all API endpoints on top of this auth + data layer
