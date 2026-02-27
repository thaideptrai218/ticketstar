# TicketStar Backend - Complete Architecture & Code Analysis

**Date:** 2026-02-27 | **Analysis Scope:** Full backend codebase `/backend/src`

---

## 1. DIRECTORY STRUCTURE

```
backend/src/
├── TicketStar.API/
│   ├── Controllers/
│   │   └── AuthController.cs
│   ├── Properties/
│   │   └── launchSettings.json
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── auth.http
│   ├── Program.cs
│   └── TicketStar.API.csproj
├── TicketStar.Application/
│   ├── DTOs/
│   │   └── Auth/
│   │       └── AuthDtos.cs
│   ├── Interfaces/
│   │   ├── IAuthService.cs
│   │   ├── IPasswordHasher.cs
│   │   ├── ISecureRandom.cs
│   │   ├── ISessionService.cs
│   │   ├── ITokenHasher.cs
│   │   └── ITokenService.cs
│   ├── Services/
│   │   ├── AuthService.cs
│   │   ├── SessionService.cs
│   │   ├── TokenService.cs
│   │   └── Security/
│   │       ├── Argon2PasswordHasher.cs
│   │       ├── CryptoRandomService.cs
│   │       └── Sha256TokenHasher.cs
│   └── TicketStar.Application.csproj
├── TicketStar.Domain/
│   ├── Entities/
│   │   ├── AuthIdentity.cs
│   │   ├── AuthSession.cs
│   │   ├── CheckIn.cs
│   │   ├── EmailChangeRequest.cs
│   │   ├── Event.cs
│   │   ├── MagicLink.cs
│   │   ├── Order.cs
│   │   ├── OrderItem.cs
│   │   ├── Payment.cs
│   │   ├── RefreshToken.cs
│   │   ├── SecurityEvent.cs
│   │   ├── StaffAssignment.cs
│   │   ├── Ticket.cs
│   │   ├── TicketType.cs
│   │   ├── User.cs
│   │   ├── UserProfile.cs
│   │   └── WebAuthnCredential.cs
│   ├── Enums/
│   │   ├── AuthProvider.cs
│   │   ├── EventStatus.cs
│   │   ├── OrderStatus.cs
│   │   ├── PaymentStatus.cs
│   │   ├── SecurityEventType.cs
│   │   └── UserRole.cs
│   └── TicketStar.Domain.csproj
└── TicketStar.Infrastructure/
    ├── Data/
    │   ├── AppDbContext.cs
    │   ├── Configurations/
    │   │   ├── AuthIdentityConfiguration.cs
    │   │   ├── AuthSessionConfiguration.cs
    │   │   ├── CheckInConfiguration.cs
    │   │   ├── EmailChangeRequestConfiguration.cs
    │   │   ├── EventConfiguration.cs
    │   │   ├── MagicLinkConfiguration.cs
    │   │   ├── OrderConfiguration.cs
    │   │   ├── OrderItemConfiguration.cs
    │   │   ├── PaymentConfiguration.cs
    │   │   ├── RefreshTokenConfiguration.cs
    │   │   ├── SecurityEventConfiguration.cs
    │   │   ├── StaffAssignmentConfiguration.cs
    │   │   ├── TicketConfiguration.cs
    │   │   ├── TicketTypeConfiguration.cs
    │   │   ├── UserConfiguration.cs
    │   │   ├── UserProfileConfiguration.cs
    │   │   └── WebAuthnCredentialConfiguration.cs
    │   └── DbSeeder.cs
    ├── Migrations/
    │   ├── 20260227091154_InitialCreate.cs
    │   ├── 20260227091154_InitialCreate.Designer.cs
    │   └── AppDbContextModelSnapshot.cs
    └── TicketStar.Infrastructure.csproj
```

---

## 2. PROJECT STRUCTURE & DEPENDENCIES

### Clean Architecture Layers

1. **TicketStar.Domain** (Innermost)
   - Pure domain logic, no external deps
   - Entities, enums, DTOs

2. **TicketStar.Application**
   - Business logic layer
   - Services (Auth, Token, Session)
   - Interfaces (contracts)
   - Depends on: Domain

3. **TicketStar.Infrastructure**
   - Data access layer
   - DbContext, configurations, migrations
   - Depends on: Domain

4. **TicketStar.API** (Outermost)
   - Controller layer
   - DI setup (Program.cs)
   - Depends on: Application, Infrastructure

### NuGet Dependencies

**TicketStar.Domain**
- (No external dependencies - pure C# 8.0 + nullable reference types)

**TicketStar.Application**
- Google.Apis.Auth 1.68.0 (OAuth validation)
- Isopoh.Cryptography.Argon2 2.0.0 (Password hashing)
- Microsoft.EntityFrameworkCore 8.0.13
- System.IdentityModel.Tokens.Jwt 8.3.0 (JWT)
- Microsoft.IdentityModel.Tokens 8.3.0 (Crypto)
- Microsoft.Extensions.Configuration.Binder 8.0.2

**TicketStar.Infrastructure**
- Microsoft.EntityFrameworkCore 8.0.13
- Microsoft.Extensions.Configuration.Abstractions 8.0.0
- Microsoft.Extensions.Logging.Abstractions 8.0.2
- Microsoft.EntityFrameworkCore.Design 8.0.13
- Pomelo.EntityFrameworkCore.MySql 8.0.3

**TicketStar.API**
- Pomelo.EntityFrameworkCore.MySql 8.0.3
- Microsoft.AspNetCore.Authentication.JwtBearer 8.0.13
- StackExchange.Redis 2.8.24
- MassTransit.RabbitMQ 8.3.4
- QRCoder 1.6.0
- Swashbuckle.AspNetCore 6.9.0

---

## 3. AUTHENTICATION ARCHITECTURE

### Auth Flow Components

```
User Request
    ↓
AuthController (HTTP entry point)
    ↓
IAuthService (business logic)
    ├→ RegisterAsync(): Email + Password registration
    ├→ LoginAsync(): Email + password verification
    ├→ GoogleLoginAsync(): OAuth2 token validation
    ├→ RequestMagicLinkAsync(): Passwordless link generation
    ├→ VerifyMagicLinkAsync(): Magic link consumption
    ├→ LogoutAsync(): Session revocation
    └→ RevokeAllSessionsAsync(): Full logout
    ↓
ITokenService (token lifecycle)
    ├→ GenerateTokenPairAsync(): Create JWT + Refresh token
    ├→ RefreshTokenAsync(): Rotate tokens (family-based reuse detection)
    ├→ RevokeRefreshTokenAsync(): Revoke single token
    └→ RevokeAllUserTokensAsync(): Revoke all user tokens
    ↓
ISessionService (device tracking)
    ├→ CreateSessionAsync(): Register new device
    ├→ DeactivateSessionAsync(): Revoke single session
    ├→ DeactivateAllSessionsAsync(): Revoke all sessions
    └→ UpdateActivityAsync(): Track session usage
```

### Security Services

All stateless, thread-safe, singleton-registered:

1. **IPasswordHasher → Argon2PasswordHasher**
   - OWASP 2025: t=3, m=64MB (65536), p=4
   - Hash length: 32 bytes
   - Used for: User registration/login password storage

2. **ITokenHasher → Sha256TokenHasher**
   - SHA-256 → lowercase hex (64 chars)
   - Constant-time verification (CryptographicOperations.FixedTimeEquals)
   - Used for: Refresh tokens, magic links, email change tokens

3. **ISecureRandom → CryptoRandomService**
   - RandomNumberGenerator (CSPRNG)
   - URL-safe Base64 encoding (replace +/= with -_)
   - Generates 64-byte tokens for refresh tokens, 32-byte for magic links
   - Generates GUIDs (no hyphens) for session/family IDs

---

## 4. COMPLETE API ENDPOINTS

### POST /api/auth/register
**Request:** `RegisterRequest(Email, Password≥8 chars, FullName)`
**Response:** `TokenResponse(AccessToken, RefreshToken, ExpiresAt, SessionId)`
**Logic:**
- Check email uniqueness (IgnoreQueryFilters for soft-deleted users)
- Hash password with Argon2
- Create User + UserProfile + AuthIdentity(Email)
- Create AuthSession
- Generate JWT + RefreshToken pair
- Log: SecurityEvent(Login, success)

### POST /api/auth/login
**Request:** `LoginRequest(Email, Password)`
**Response:** `TokenResponse(...)`
**Logic:**
- Lookup user by email (IgnoreQueryFilters)
- Check not locked, not deleted
- Verify password; on failure: increment FailedLoginCount atomically
- After 5 failures: lock account for 15 min
- On success: reset FailedLoginCount, create session, generate tokens
- Log: SecurityEvent(Login|LoginFailed)

### POST /api/auth/google-login
**Request:** `GoogleLoginRequest(IdToken)`
**Response:** `TokenResponse(...)`
**Logic:**
- Validate Google JWT signature
- Verify email verified (RED TEAM H1)
- Lookup or create User
- Prevent silent provider merge (RED TEAM H1) — require explicit linking
- Update/create AuthIdentity(Google)
- Create session, generate tokens
- Log: SecurityEvent(GoogleOAuthLogin)

### POST /api/auth/magic-link/request
**Request:** `MagicLinkRequest(Email)`
**Response:** `{ message: "If email exists..." }`
**Rate Limit:** 5 per 15 min per IP
**Logic:**
- Prevent email enumeration (always return success)
- If user exists: generate token, store hash, set 10-min expiry
- Log token hash prefix (never plaintext)
- In dev: console log plaintext token
- Log: SecurityEvent(MagicLinkRequested)

### POST /api/auth/magic-link/verify
**Request:** `MagicLinkVerifyRequest(Token)`
**Response:** `TokenResponse(...)`
**Logic:**
- Hash token, lookup unused magic link
- Check expiry
- Mark UsedAt atomically (RowVersion prevents double-use)
- Mark email verified
- Create session, generate tokens
- Log: SecurityEvent(MagicLinkVerified)

### POST /api/auth/refresh
**Request:** `RefreshRequest(RefreshToken)`
**Response:** `TokenResponse(...)`
**Logic:**
- Hash token, lookup refresh token
- Reuse detection: if revoked → revoke entire FamilyId
- Check expiry, user not deleted/locked
- Revoke old token, create new in same family
- Update session LastActivityAt
- Generate new JWT + refresh token
- Return new pair (client must use new refresh token)

### POST /api/auth/logout
**Requires:** [Authorize]
**Request:** `RefreshRequest(RefreshToken)`
**Response:** `{ message: "Logged out successfully." }`
**Logic:**
- Hash token, lookup refresh token
- Begin transaction
- Mark RefreshToken RevokedAt
- Mark AuthSession inactive + RevokedAt
- Commit transaction
- Log: SecurityEvent(Logout)

### POST /api/auth/revoke-all
**Requires:** [Authorize]
**Response:** `{ message: "All sessions revoked." }`
**Logic:**
- Extract userId from JWT claims
- RevokeAllUserTokensAsync() → mark all refresh tokens revoked
- DeactivateAllSessionsAsync() → mark all sessions inactive
- Rotate SecurityStamp (invalidates all JWTs on next refresh)
- Log: SecurityEvent(AllSessionsRevoked)

---

## 5. JWT STRUCTURE

### Access Token Claims
```
{
  "sub": "<user.Id>",              // Subject (user ID)
  "email": "<user.Email>",
  "jti": "<Guid>",                 // JWT ID (unique)
  "email_verified": "true/false",
  "role": "User|Staff|Organizer|Admin",
  "sid": "<session.Id (no hyphens)>",
  "sstamp": "<user.SecurityStamp[:8]>"
}
```

### Token Validation
- Issuer: config["Jwt:Issuer"]
- Audience: config["Jwt:Audience"]
- Expiry: config["Jwt:ExpiryMinutes"] (default 15)
- Signature: HS256 with Jwt:Secret
- ClockSkew: 0 (strict)

### Refresh Token Storage
- Plain: 64-byte URL-safe Base64
- Stored: SHA-256 hash (hex, lowercase)
- FamilyId: groups rotation chain
- Expiry: 7 days
- RevokedAt: null when active

---

## 6. DATABASE ENTITIES (17 total)

### Authentication Entities

**User**
- Id (Guid as string), Email, EmailVerified
- PasswordHash (nullable for OAuth-only), Role, SecurityStamp
- FailedLoginCount, LockedUntil, CreatedAt, UpdatedAt, DeletedAt (soft-delete)
- IsLocked property: `LockedUntil.HasValue && LockedUntil > DateTime.UtcNow`
- Navigation: Profile, AuthIdentities[], RefreshTokens[], MagicLinks[], AuthSessions[], SecurityEvents[], EmailChangeRequests[]

**UserProfile**
- UserId (PK), FullName, AvatarUrl, Phone, PhoneVerified, Bio, UpdatedAt
- Purpose: GDPR PII separation, auto-created 1:1 with User
- Navigation: User

**AuthIdentity**
- Id (Guid), UserId, Provider (Email|Google|MagicLink)
- ProviderUserId, ProviderEmail, AccessToken (NOT YET ENCRYPTED), ProviderRefreshToken (NOT YET ENCRYPTED)
- TokenExpiresAt, LastUsedAt, CreatedAt
- One user can have multiple identities

**AuthSession**
- Id (Guid), UserId, IpAddress, UserAgent, DeviceFingerprint (SHA-256)
- IsActive, LastActivityAt, CreatedAt, RevokedAt
- Embedded in JWT as "sid" claim for per-device revocation
- Navigation: RefreshTokens[]

**RefreshToken**
- Id (Guid), UserId, SessionId, TokenHash (SHA-256), FamilyId
- ExpiresAt, CreatedAt, RevokedAt
- IsExpired, IsRevoked, IsActive properties
- FamilyId groups rotation chains for reuse detection

**MagicLink**
- Id (Guid), UserId, TokenHash (SHA-256), IpAddress
- ExpiresAt (10 min), UsedAt (null until consumed), CreatedAt
- RowVersion (TIMESTAMP(6) for optimistic concurrency)
- IsExpired, IsUsed properties

**WebAuthnCredential**
- Id (Guid), UserId, CredentialId (Base64url), PublicKey (CBOR)
- SignCount, DeviceName, CreatedAt, LastUsedAt
- Future stub for WebAuthn/Passkey support (no service yet)

**SecurityEvent**
- Id (auto int64), UserId (nullable), EventType (enum), Success
- FailureReason, IpAddress, UserAgent, Metadata (JSON), CreatedAt
- Immutable audit log; failed logins still logged with null userId

**EmailChangeRequest**
- Id (Guid), UserId, NewEmail, TokenHash (SHA-256)
- ExpiresAt, VerifiedAt, CreatedAt
- Pending email change verification

### Business Entities

**Event**
- Id (Guid), OrganizerId, Title, Description, StartAt, EndAt, Venue
- Status (Draft|Published|Cancelled), ImageUrl, Slug, CreatedAt, UpdatedAt
- Navigation: TicketTypes[], Tickets[], CheckIns[], StaffAssignments[]

**TicketType**
- Id (Guid), EventId, Name, Price, Quota, SoldCount
- SaleStartAt, SaleEndAt, CreatedAt, UpdatedAt
- Navigation: OrderItems[], Tickets[]

**Ticket**
- Id (Guid), OrderItemId, UserId, EventId, TicketTypeId
- QrCode, IsCheckedIn, CreatedAt
- Navigation: OrderItem, User, Event, TicketType, CheckIn (nullable)

**Order**
- Id (Guid), UserId, Status (Pending|Paid|Cancelled|Expired)
- TotalAmount, ExpiresAt, CreatedAt, UpdatedAt, PaidAt
- Navigation: Items[], Payment (nullable)

**OrderItem**
- Id (Guid), OrderId, TicketTypeId, Quantity, UnitPrice, CreatedAt
- Navigation: Order, TicketType, Tickets[]

**Payment**
- Id (Guid), OrderId, Provider (string), ExternalRef, Amount
- Status (Pending|Success|Failed), CreatedAt, ProcessedAt, UpdatedAt
- Navigation: Order

**CheckIn**
- Id (Guid), TicketId, ScannedBy (UserId), ScannedAt, EventId
- Navigation: Ticket, Scanner (User), Event

**StaffAssignment**
- Id (Guid), UserId, EventId, AssignedBy (UserId), AssignedAt
- Navigation: User, Event, Assigner (User)

---

## 7. SECURITY FEATURES IMPLEMENTED

### Password Security
- Argon2id hashing (OWASP 2025 params)
- Never stored plaintext
- Verified via Argon2.Verify()

### Token Security
- Refresh tokens: 64-byte cryptographically secure random
- Magic links: 32-byte cryptographically secure random
- Both stored as SHA-256 hashes (never plaintext)
- Constant-time comparison prevents timing attacks (RED TEAM H3)

### Brute Force Protection
- Track failed login attempts per user
- Lock after 5 failures for 15 minutes
- Atomic increment (ExecuteUpdateAsync) prevents race conditions (RED TEAM H6)

### Token Rotation & Reuse Detection
- Refresh tokens organized in families (FamilyId)
- Old token revoked on refresh, new issued in same family
- Reuse detection: if old token used again → entire family revoked (RED TEAM H4)
- JWT embedded with session ID (sid) for per-session revocation

### Email Enumeration Prevention
- Magic link request always returns success (prevents email enumeration)

### Provider Merge Prevention
- OAuth (Google) prevents silent account merge
- Requires explicit account linking (RED TEAM H1)
- Validates Google email verified flag

### Google OAuth Security
- Validates JWT signature using Google public keys (Google.Apis.Auth)
- Requires email verified (RED TEAM H1)
- Validates audience (ClientId)

### Session Tracking
- Device fingerprint: SHA-256(IP + UserAgent)
- Device-specific session revocation
- Session activity timestamps
- UserAgent truncated to 512 chars

### Audit Logging
- Comprehensive SecurityEvent logging
- Tracks login, logout, failed attempts, account locks, role changes
- Immutable records (only CreatedAt, no updates)
- Failed events logged with null userId (prevents info leaks)

### Soft Deletes
- User.DeletedAt allows GDPR compliance
- Global query filter (User) excludes soft-deleted
- IgnoreQueryFilters() used for security-sensitive lookups (RED TEAM H5)

### Email Change Flow
- Separate EmailChangeRequest entity
- Token-based verification (not implemented in auth endpoints yet)

---

## 8. PROGRAM.CS CONFIGURATION

```csharp
// 1. Database
DbContext<AppDbContext> + MySql (auto-detect version)

// 2. JWT Authentication
Scheme: JwtBearerDefaults
Claims validation: Issuer, Audience, Lifetime, IssuerSigningKey
ClockSkew: 0 (strict)

// 3. Rate Limiting
Policy: "magic-link" → 5 permits per 15 min per IP

// 4. Security Services (Singleton)
- IPasswordHasher → Argon2PasswordHasher
- ITokenHasher → Sha256TokenHasher
- ISecureRandom → CryptoRandomService

// 5. Application Services (Scoped)
- ISessionService → SessionService
- ITokenService → TokenService
- IAuthService → AuthService

// 6. Controllers + Swagger + CORS
Endpoints: /api/auth/*
Swagger: /swagger
CORS: http://localhost:3001 (frontend)

// 7. Database Seeding
Runs on app startup with DbSeeder
```

---

## 9. ENUMS REFERENCE

### UserRole
- User (0)
- Staff (1)
- Organizer (2)
- Admin (3)

### AuthProvider
- Email (0)
- Google (1)
- MagicLink (2)

### SecurityEventType
- Login, LoginFailed, Logout
- PasswordChanged, PasswordResetRequested
- EmailChanged, EmailChangeRequested
- RoleChanged, AccountLocked, AccountUnlocked
- TokenRefreshed, TokenReuseDetected, AllSessionsRevoked
- MagicLinkRequested, MagicLinkVerified
- GoogleOAuthLogin

### EventStatus
- Draft, Published, Cancelled

### OrderStatus
- Pending, Paid, Cancelled, Expired

### PaymentStatus
- Pending, Success, Failed

---

## 10. DTOs (Data Transfer Objects)

### Requests
- `RegisterRequest(Email, Password≥8, FullName)`
- `LoginRequest(Email, Password)`
- `GoogleLoginRequest(IdToken)`
- `MagicLinkRequest(Email)`
- `MagicLinkVerifyRequest(Token)`
- `RefreshRequest(RefreshToken)`

### Responses
- `TokenResponse(AccessToken, RefreshToken, ExpiresAt, SessionId)`

---

## 11. RED TEAM SECURITY FIXES DOCUMENTED IN CODE

1. **H1** - Google OAuth: Verify email verified, prevent silent provider merge
2. **H2** - Magic links: Log only hash prefix, never plaintext
3. **H3** - Token hashing: Use constant-time comparison (CryptographicOperations.FixedTimeEquals)
4. **H4** - Logout: Atomic transaction to prevent race condition
5. **H5** - Registration/Login: Use IgnoreQueryFilters() to catch soft-deleted users
6. **H6** - Brute force: Use ExecuteUpdateAsync for atomic login attempt increment

---

## 12. MIGRATION STATUS

**Latest Migration:** `20260227091154_InitialCreate`
- Creates all 17 entities
- Configures all relationships
- Sets up soft-delete filter
- Indexes for FK relationships

---

## 13. KEY ARCHITECTURAL DECISIONS

1. **Layered Clean Architecture**: Domain → Application → Infrastructure → API
2. **JWT + Refresh Token Pattern**: Short-lived access tokens (15 min), 7-day refresh tokens
3. **Token Families**: Group refresh tokens for reuse detection
4. **Security Stamps**: Per-user rotation for instant JWT invalidation
5. **Session-Based Revocation**: Per-device logout via session ID
6. **Hashed Tokens**: Never store plaintext refresh/magic link tokens
7. **Soft Deletes**: GDPR compliance without permanent data loss
8. **Audit Logging**: Immutable SecurityEvent records
9. **CSPRNG Tokens**: Cryptographically secure random for all sensitive tokens
10. **Device Fingerprints**: SHA-256(IP + UserAgent) for device tracking
11. **Rate Limiting**: Per-IP, per-window for magic link requests
12. **Constant-Time Comparison**: Prevent timing side-channel attacks on token hashes

---

## 14. NOTES & KNOWN LIMITATIONS

- **OAuth Token Encryption**: AccessToken/ProviderRefreshToken in AuthIdentity NOT encrypted (deferred to phase 2)
- **WebAuthn**: Stub only, no service implementation (MFA phase)
- **Email Sending**: Console log in dev environment (production email service deferred)
- **Password Reset**: EmailChangeRequest entity exists but not wired to API yet
- **Phone Verification**: UserProfile.Phone properties exist but not implemented

---

## 15. TESTING SURFACE

**Auth Endpoints (7)**:
1. POST /api/auth/register
2. POST /api/auth/login
3. POST /api/auth/google-login
4. POST /api/auth/magic-link/request
5. POST /api/auth/magic-link/verify
6. POST /api/auth/refresh
7. POST /api/auth/logout
8. POST /api/auth/revoke-all

**Edge Cases to Cover**:
- Soft-deleted user re-registration
- Account lockout after 5 failed attempts
- Token reuse detection (revoke family)
- Magic link double-use prevention (RowVersion)
- Concurrent refresh operations (race conditions)
- Expired tokens (refresh, magic link, etc.)
- Invalid credentials (timing attack resistance)
- Missing claims in JWT validation

---

**Report generated:** 2026-02-27
