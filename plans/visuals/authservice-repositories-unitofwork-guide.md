# AuthService - Real-World Repository & UnitOfWork Usage

## What is AuthService?

**AuthService** is the **business logic layer** that handles all authentication operations:

```
User Request
    ↓
Controller (API endpoint)
    ↓
AuthService (business logic)
    ↓
Repositories (data access)
    ↓
Database
```

It's responsible for:

- User registration
- Email/password login
- Google OAuth login
- Magic link authentication
- Logout & session revocation
- Security event logging

---

## Architecture: AuthService Dependencies

### Constructor Injection

```csharp
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IAuthIdentityRepository _identityRepo;
    private readonly IMagicLinkRepository _magicLinkRepo;
    private readonly IRefreshTokenRepository _refreshTokenRepo;
    private readonly ISecurityEventRepository _securityEventRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenHasher _tokenHasher;
    private readonly ISecureRandom _random;
    private readonly ITokenService _tokenService;
    private readonly ISessionService _sessionService;
    private readonly GoogleAuthOptions _googleOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepo,
        IAuthIdentityRepository identityRepo,
        IMagicLinkRepository magicLinkRepo,
        IRefreshTokenRepository refreshTokenRepo,
        ISecurityEventRepository securityEventRepo,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenHasher tokenHasher,
        ISecureRandom random,
        ITokenService tokenService,
        ISessionService sessionService,
        IOptions<GoogleAuthOptions> googleOptions,
        ILogger<AuthService> logger)
    {
        // Store all dependencies
        _userRepo = userRepo;
        _identityRepo = identityRepo;
        _magicLinkRepo = magicLinkRepo;
        _refreshTokenRepo = refreshTokenRepo;
        _securityEventRepo = securityEventRepo;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenHasher = tokenHasher;
        _random = random;
        _tokenService = tokenService;
        _sessionService = sessionService;
        _googleOptions = googleOptions.Value;
        _logger = logger;
    }
}
```

### What Each Dependency Does

| Dependency                    | What It Is                           | Why Needed                                            |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `IUserRepository`             | Specialized repo for User entities   | Query/modify users (email lookup, lock account, etc.) |
| `IAuthIdentityRepository`     | Specialized repo for auth identities | Store OAuth providers (Google, Email)                 |
| `IMagicLinkRepository`        | Specialized repo for magic links     | Store magic link tokens                               |
| `IRefreshTokenRepository`     | Specialized repo for refresh tokens  | Revoke tokens on logout                               |
| `ISecurityEventRepository`    | Generic `IRepository<SecurityEvent>` | Log security events (login, logout, lockout)          |
| `IUnitOfWork`                 | Transaction coordinator              | Save all changes atomically                           |
| `IPasswordHasher`             | Singleton service                    | Hash/verify passwords (Argon2)                        |
| `ITokenHasher`                | Singleton service                    | Hash tokens before storing (SHA256)                   |
| `ISecureRandom`               | Singleton service                    | Generate secure random tokens                         |
| `ITokenService`               | Service                              | Generate JWT tokens                                   |
| `ISessionService`             | Service                              | Create/manage user sessions                           |
| `IOptions<GoogleAuthOptions>` | Config                               | Google OAuth client ID                                |
| `ILogger<AuthService>`        | Logger                               | Log debug/info messages                               |

---

## Method 1: RegisterAsync - Using Repositories + UnitOfWork

```csharp
public async Task<Result<TokenResponse>> RegisterAsync(
    RegisterRequest request,
    string? ip,
    string? ua)
{
    // Step 1: Check if email already exists
    // Uses specialized IUserRepository method
    if (await _userRepo.EmailExistsAsync(request.Email))
        return Result<TokenResponse>.Failure(
            "Email already registered.",
            ResultError.Conflict);
    // ↑ Queries DB: SELECT * FROM Users WHERE Email = @email (ignoring soft-delete filter)

    // Step 2: Create new user entity
    var user = new User
    {
        Email = request.Email,
        EmailVerified = false,
        PasswordHash = _passwordHasher.Hash(request.Password),
        Role = UserRole.User,
    };
    user.Profile = new UserProfile
    {
        UserId = user.Id,
        FullName = request.FullName
    };

    // Step 3: Create auth identity (tracks which provider: Email/Google)
    var identity = new AuthIdentity
    {
        UserId = user.Id,
        Provider = AuthProvider.Email,
        ProviderUserId = request.Email,
        ProviderEmail = request.Email,
    };

    // Step 4: Add both entities to repositories (in memory)
    _userRepo.Add(user);              // Marks User as "Added"
    _identityRepo.Add(identity);      // Marks AuthIdentity as "Added"

    // Step 5: Save ALL changes atomically
    await _unitOfWork.SaveChangesAsync();
    // ↑ Executes:
    //   INSERT INTO Users (Email, PasswordHash, ...)
    //   INSERT INTO AuthIdentities (UserId, Provider, ...)
    // Both succeed or both fail!

    // Step 6: Create session and tokens
    var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
    var tokens = await _tokenService.GenerateTokenPairAsync(user, session);

    // Step 7: Log security event
    await LogEventAsync(user.Id, SecurityEventType.Login, true, ip, ua);

    return Result<TokenResponse>.Success(tokens);
}
```

### What We See Here

**Repositories Usage:**

```csharp
// Query database
if (await _userRepo.EmailExistsAsync(request.Email))

// Add to repository (in memory)
_userRepo.Add(user);
_identityRepo.Add(identity);
```

**UnitOfWork Usage:**

```csharp
// Save all changes atomically
await _unitOfWork.SaveChangesAsync();
```

**Flow:**

```
Check email exists (query)
    ↓
Create User + AuthIdentity (in memory)
    ↓
Add to repositories (in memory)
    ↓
Save via UnitOfWork (INSERT into DB)
```

---

## Method 2: LoginAsync - Repository Queries + Transaction Safety

```csharp
public async Task<Result<TokenResponse>> LoginAsync(
    LoginRequest request,
    string? ip,
    string? ua)
{
    // Step 1: Get user by email (including soft-deleted)
    // Uses QueryIgnoreFilters because we need to check if account was deleted
    var user = await _userRepo.GetByEmailIgnoreFiltersAsync(request.Email);
    // ↑ Special method that bypasses soft-delete filter
    // SELECT * FROM Users WHERE Email = @email (no DeletedAt check)

    if (user is null)
    {
        await LogEventAsync(null, SecurityEventType.LoginFailed, false, ip, ua, "Unknown email");
        return Result<TokenResponse>.Failure("Invalid credentials.", ResultError.Unauthorized);
    }

    // Step 2: Check if account is locked
    if (user.IsLocked)
    {
        await LogEventAsync(user.Id, SecurityEventType.LoginFailed, false, ip, ua, "Account locked");
        return Result<TokenResponse>.Failure("Invalid credentials.", ResultError.Unauthorized);
    }

    // Step 3: Verify password
    if (user.PasswordHash is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
    {
        // SECURITY: Atomic increment prevents race condition on brute force
        await _userRepo.IncrementFailedLoginAsync(user.Id);
        // ↑ Direct SQL UPDATE (no load-modify-save)
        // UPDATE Users SET FailedLoginCount = FailedLoginCount + 1 WHERE Id = @userId

        // Reload to check if now locked
        await _userRepo.ReloadAsync(user);
        // ↑ Refresh entity from DB after atomic update

        // Check if exceeded max attempts
        if (user.FailedLoginCount >= 5)
        {
            // Lock account for 15 minutes
            await _userRepo.LockAccountAsync(user.Id, DateTime.UtcNow.AddMinutes(15));
            // ↑ Another direct SQL UPDATE (atomic)
            await LogEventAsync(user.Id, SecurityEventType.AccountLocked, true, ip, ua);
        }

        await LogEventAsync(user.Id, SecurityEventType.LoginFailed, false, ip, ua, "Wrong password");
        return Result<TokenResponse>.Failure("Invalid credentials.", ResultError.Unauthorized);
    }

    // Step 4: Password correct - reset failed attempts
    user.FailedLoginCount = 0;
    user.LockedUntil = null;
    await _unitOfWork.SaveChangesAsync();
    // ↑ UPDATE Users SET FailedLoginCount = 0, LockedUntil = NULL WHERE Id = @userId

    // Step 5: Create session and tokens
    var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
    var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
    await LogEventAsync(user.Id, SecurityEventType.Login, true, ip, ua);

    return Result<TokenResponse>.Success(tokens);
}
```

### Key Patterns Here

**1. Query with Bypass Filter:**

```csharp
var user = await _userRepo.GetByEmailIgnoreFiltersAsync(request.Email);
// Need to check all users, even soft-deleted ones
```

**2. Atomic Operations (Direct SQL):**

```csharp
// Instead of: load user, modify, save (3 DB calls)
await _userRepo.IncrementFailedLoginAsync(user.Id);
// Direct SQL UPDATE (1 DB call, atomic)
// UPDATE Users SET FailedLoginCount = FailedLoginCount + 1
```

**3. Reload After Atomic Update:**

```csharp
await _userRepo.IncrementFailedLoginAsync(user.Id);
await _userRepo.ReloadAsync(user);  // Get updated value from DB
if (user.FailedLoginCount >= 5)     // Now check updated value
```

---

## Method 3: LogoutAsync - TRANSACTION Example

```csharp
public async Task<Result> LogoutAsync(string refreshToken)
{
    // Step 1: Hash the refresh token
    var hash = _tokenHasher.Hash(refreshToken);

    // Step 2: Find stored token
    var stored = await _refreshTokenRepo.GetByHashAsync(hash);
    if (stored is null) return Result.Success();

    // Step 3: START TRANSACTION
    // All following operations must all succeed or all fail
    await _unitOfWork.BeginTransactionAsync();
    try
    {
        // Step 4: Revoke refresh token
        stored.RevokedAt = DateTime.UtcNow;

        // Step 5: Get and deactivate session
        var session = await _sessionService.GetSessionAsync(stored.SessionId);
        if (session is { IsActive: true })
        {
            session.IsActive = false;
            session.RevokedAt = DateTime.UtcNow;
        }

        // Step 6: Save both changes atomically
        await _unitOfWork.SaveChangesAsync();
        // ↑ Now both the token AND session are updated

        // Step 7: COMMIT - persist all changes
        await _unitOfWork.CommitTransactionAsync();
        // If we reach here, everything is committed
    }
    catch
    {
        // Step 8: If ANY error occurs, ROLLBACK
        await _unitOfWork.RollbackTransactionAsync();
        // Token revocation is undone, session revocation is undone
        throw;
    }

    // Step 9: Log event (outside transaction)
    await LogEventAsync(stored.UserId, SecurityEventType.Logout, true, null, null);
    return Result.Success();
}
```

### Transaction Flow

```
BeginTransactionAsync()
    ↓
Update Token.RevokedAt (in memory)
    ↓
Update Session.IsActive (in memory)
    ↓
SaveChangesAsync()
    ↓ (all changes in DB but not committed yet)
CommitTransactionAsync()
    ↓ (changes now permanent)
SUCCESS: Both token and session revoked

ERROR during any step above:
    ↓
RollbackTransactionAsync()
    ↓ (all changes undone, database unchanged)
FAILURE: Nothing was revoked
```

---

## Method 4: LogEventAsync - Simple Repository Add

```csharp
private async Task LogEventAsync(
    string? userId,
    SecurityEventType type,
    bool success,
    string? ip,
    string? ua,
    string? failureReason = null)
{
    // Step 1: Create security event entity
    _securityEventRepo.Add(new SecurityEvent
    {
        UserId = userId,
        EventType = type,
        Success = success,
        FailureReason = failureReason,
        IpAddress = ip,
        UserAgent = ua,
    });
    // ↑ Uses generic IRepository<SecurityEvent>.Add()

    // Step 2: Save immediately
    await _unitOfWork.SaveChangesAsync();
    // ↑ INSERT INTO SecurityEvents (...)
}
```

This is called after every auth operation to create an audit trail.

---

## Complete Flow: User Registration

```
┌─────────────────────────────────────────────────────────┐
│ 1. User calls RegisterAsync(email, password, name)      │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Query: Check if email exists                         │
│    _userRepo.EmailExistsAsync(email)                    │
│    ↓                                                     │
│    SELECT * FROM Users WHERE Email = @email             │
│    (ignoring soft-delete filter)                         │
└──────────────────────┬──────────────────────────────────┘
                       ↓
                   If exists → return error
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Create entities in memory                            │
│    user = new User { Email, PasswordHash, ... }         │
│    identity = new AuthIdentity { ... }                  │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Mark for insertion                                   │
│    _userRepo.Add(user)          → "Added" state         │
│    _identityRepo.Add(identity)  → "Added" state         │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Save atomically                                      │
│    await _unitOfWork.SaveChangesAsync()                 │
│    ↓                                                     │
│    INSERT INTO Users (Email, PasswordHash, ...)         │
│    INSERT INTO AuthIdentities (UserId, Provider, ...)   │
│    ↓                                                     │
│    Both succeed or both fail!                           │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Create session                                       │
│    session = _sessionService.CreateSessionAsync(...)    │
│    ↓                                                     │
│    INSERT INTO AuthSessions (...)                       │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Generate tokens                                      │
│    tokens = _tokenService.GenerateTokenPairAsync(...)   │
│    ↓                                                     │
│    INSERT INTO RefreshTokens (...)                      │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Log security event                                   │
│    LogEventAsync(userId, SecurityEventType.Login, ...)  │
│    ↓                                                     │
│    INSERT INTO SecurityEvents (...)                     │
└──────────────────────┬──────────────────────────────────┘
                       ↓
                   Return tokens to user
```

---

## Repository Methods Used by AuthService

### From IUserRepository

```csharp
// Query
await _userRepo.GetByIdAsync(userId, ct);
await _userRepo.GetByEmailAsync(email, ct);
await _userRepo.GetByEmailIgnoreFiltersAsync(email, ct);
await _userRepo.EmailExistsAsync(email, ct);

// Atomic operations
await _userRepo.IncrementFailedLoginAsync(userId);
await _userRepo.LockAccountAsync(userId, lockUntil);

// Utility
await _userRepo.ReloadAsync(user);

// Write (deferred)
_userRepo.Add(user);
_userRepo.Update(user);
```

### From IAuthIdentityRepository

```csharp
// Specialized methods
await _identityRepo.HasProviderAsync(userId, provider);
await _identityRepo.GetByUserAndProviderAsync(userId, provider);

// Generic
_identityRepo.Add(identity);
```

### From IMagicLinkRepository

```csharp
// Specialized methods
await _magicLinkRepo.GetByHashWithUserAsync(hash);

// Generic
_magicLinkRepo.Add(magicLink);
```

### From IRefreshTokenRepository

```csharp
// Specialized methods
await _refreshTokenRepo.GetByHashAsync(hash);

// Generic
_refreshTokenRepo.Add(token);
```

### From ISecurityEventRepository (Generic)

```csharp
// Generic IRepository<SecurityEvent>
_securityEventRepo.Add(new SecurityEvent { ... });
```

---

## Key Patterns in AuthService

### Pattern 1: Query Then Modify

```csharp
// Get user
var user = await _userRepo.GetByIdAsync(userId);

// Modify in memory
user.Email = "new@email.com";

// Save
_userRepo.Update(user);
await _unitOfWork.SaveChangesAsync();
```

### Pattern 2: Atomic Operations (Direct SQL)

```csharp
// Instead of load-modify-save, use direct SQL
await _userRepo.IncrementFailedLoginAsync(userId);
// No race condition, no loading entity
```

### Pattern 3: Query Filters with Bypass

```csharp
// Normal: get active user
var user = await _userRepo.GetByIdAsync(userId);

// Bypass filter: need deleted user
var user = await _userRepo.GetByEmailIgnoreFiltersAsync(email);
```

### Pattern 4: Transaction Coordination

```csharp
await _unitOfWork.BeginTransactionAsync();
try
{
    // Multiple operations
    await _unitOfWork.SaveChangesAsync();
    await _unitOfWork.CommitTransactionAsync();
}
catch
{
    await _unitOfWork.RollbackTransactionAsync();
}
```

### Pattern 5: Reload After Atomic Update

```csharp
await _userRepo.IncrementFailedLoginAsync(userId);
await _userRepo.ReloadAsync(user);  // Get updated value
if (user.FailedLoginCount >= 5)     // Use updated value
```

---

## Why AuthService is a Great Example

| Aspect                    | What AuthService Shows                             |
| ------------------------- | -------------------------------------------------- |
| **Multiple repositories** | Uses 5 specialized repos + 1 generic repo          |
| **Repository methods**    | Queries, atomic updates, bypass filters            |
| **UnitOfWork usage**      | Save, transaction begin/commit/rollback            |
| **Transaction safety**    | Atomic logout (token + session together)           |
| **Error handling**        | Validation, security checks, proper errors         |
| **Security patterns**     | Token hashing, password hashing, atomic increments |
| **Audit trail**           | Logs every auth event with details                 |
| **Real-world complexity** | OAuth, magic links, sessions, lockout logic        |

---

## Summary

**AuthService demonstrates:**

1. **Dependency Injection** - 13 dependencies injected, all organized
2. **Repository Pattern** - Uses 6 specialized repositories for queries/modifications
3. **UnitOfWork** - Coordinates saves and transactions
4. **Atomic Operations** - Direct SQL for race-condition-safe updates
5. **Query Filters** - Normal queries + QueryIgnoreFilters for special cases
6. **Transaction Management** - BeginTransaction, CommitTransaction, RollbackTransaction
7. **Security** - Hashing, atomic increments, soft-deletes, event logging
8. **Clean Code** - Business logic separated from data access

**This is the professional pattern you should follow in TicketStar!**
