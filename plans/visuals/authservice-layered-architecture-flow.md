# AuthService: Complete Layered Architecture Flow

## The Complete Architecture Stack

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: PRESENTATION (API CONTROLLERS)                      │
│ AuthController.cs                                             │
│  ├─ [HttpPost("register")]                                   │
│  ├─ [HttpPost("login")]                                      │
│  ├─ [HttpPost("google-login")]                               │
│  ├─ [HttpPost("magic-link")]                                 │
│  └─ [HttpPost("logout")]                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP Request with payload
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: APPLICATION (BUSINESS LOGIC)                        │
│ AuthService.cs                                                │
│  ├─ RegisterAsync()                                          │
│  ├─ LoginAsync()                                             │
│  ├─ GoogleLoginAsync()                                       │
│  ├─ RequestMagicLinkAsync()                                  │
│  ├─ VerifyMagicLinkAsync()                                   │
│  ├─ LogoutAsync()                                            │
│  ├─ RevokeAllSessionsAsync()                                 │
│  └─ LogEventAsync()                                          │
│                                                               │
│ Dependencies injected:                                        │
│  ├─ IUserRepository                                          │
│  ├─ IAuthIdentityRepository                                  │
│  ├─ IMagicLinkRepository                                     │
│  ├─ IRefreshTokenRepository                                  │
│  ├─ ISecurityEventRepository                                 │
│  ├─ IUnitOfWork                                              │
│  ├─ IPasswordHasher, ITokenHasher, ISecureRandom             │
│  ├─ ITokenService, ISessionService                           │
│  └─ ILogger, IOptions<GoogleAuthOptions>                     │
└──────────────────┬──────────────────────────────────────────┘
                   │ Method calls (RegisterAsync, LoginAsync, etc.)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3A: DATA ACCESS - REPOSITORIES                         │
│ IRepository<T> (Generic Interface)                            │
│ + Specialized Interfaces                                      │
│                                                               │
│ ├─ IUserRepository (Specialized)                             │
│ │   └─ Implementations: GetByEmailAsync, EmailExistsAsync    │
│ │       IncrementFailedLoginAsync, LockAccountAsync          │
│ │                                                             │
│ ├─ IAuthIdentityRepository (Specialized)                     │
│ │   └─ HasProviderAsync, GetByUserAndProviderAsync           │
│ │                                                             │
│ ├─ IMagicLinkRepository (Specialized)                        │
│ │   └─ GetByHashWithUserAsync                                │
│ │                                                             │
│ ├─ IRefreshTokenRepository (Specialized)                     │
│ │   └─ GetByHashAsync                                        │
│ │                                                             │
│ └─ ISecurityEventRepository (Generic)                        │
│     └─ Inherited from IRepository<SecurityEvent>             │
│                                                               │
│ Implementation: EfRepository<T> + Specialized Classes         │
│  ├─ EfRepository<User>                                       │
│  ├─ EfRepository<AuthIdentity>                               │
│  ├─ EfRepository<MagicLink>                                  │
│  ├─ EfRepository<RefreshToken>                               │
│  ├─ EfRepository<SecurityEvent>                              │
│  └─ ... (Generic for others)                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │ DbSet operations (Add, Where, FirstOrDefault, etc.)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3B: TRANSACTION COORDINATOR                            │
│ IUnitOfWork (Interface)                                       │
│  ├─ SaveChangesAsync()                                       │
│  ├─ BeginTransactionAsync()                                  │
│  ├─ CommitTransactionAsync()                                 │
│  └─ RollbackTransactionAsync()                               │
│                                                               │
│ Implementation: EfUnitOfWork                                  │
│  └─ Wraps AppDbContext transactions                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ Change tracking & SQL generation
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: ORM (ENTITY FRAMEWORK CORE)                         │
│ AppDbContext                                                  │
│  ├─ DbSet<User>                                              │
│  ├─ DbSet<AuthIdentity>                                      │
│  ├─ DbSet<MagicLink>                                         │
│  ├─ DbSet<RefreshToken>                                      │
│  ├─ DbSet<AuthSession>                                       │
│  ├─ DbSet<SecurityEvent>                                     │
│  └─ ... (other entities)                                     │
│                                                               │
│ Features:                                                     │
│  ├─ ChangeTracker (tracks Added/Modified/Deleted)            │
│  ├─ Query filters (auto-apply WHERE clauses)                 │
│  ├─ Entity configurations (relationships, constraints)       │
│  └─ SaveChanges (translates to SQL)                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ SQL generation & execution
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 5: DATABASE (MYSQL)                                    │
│                                                               │
│ Tables:                                                       │
│  ├─ Users (Email, PasswordHash, FailedLoginCount, etc.)      │
│  ├─ AuthIdentities (UserId, Provider, ProviderUserId)        │
│  ├─ MagicLinks (UserId, TokenHash, ExpiresAt)                │
│  ├─ RefreshTokens (UserId, TokenHash, RevokedAt)             │
│  ├─ AuthSessions (UserId, IsActive, RevokedAt)               │
│  ├─ SecurityEvents (UserId, EventType, Success, IpAddress)   │
│  └─ ... (other tables)                                       │
│                                                               │
│ SQL Examples:                                                 │
│  ├─ SELECT * FROM Users WHERE Email = @email                │
│  ├─ INSERT INTO Users (Email, PasswordHash, ...) VALUES (...) │
│  ├─ UPDATE Users SET FailedLoginCount = ... WHERE Id = ...   │
│  └─ DELETE FROM MagicLinks WHERE ExpiresAt < NOW()           │
└─────────────────────────────────────────────────────────────┘
```

---

## Example: User Registration Flow (Layer by Layer)

### LAYER 1: API CONTROLLER

```csharp
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken ct)
    {
        // Extract client info
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

        // Delegate to service
        var result = await _authService.RegisterAsync(request, ipAddress, userAgent);

        // Return response
        if (result.IsSuccess)
            return Ok(result.Value);
        else
            return StatusCode(ToHttpStatus(result.ErrorType), result.Error);
    }
}

// Flow in controller:
// 1. Extract HTTP request data (email, password, fullname)
// 2. Get client context (IP, User-Agent)
// 3. Call AuthService method
// 4. Return HTTP response (200 OK or error status)
```

**What happens:**
- HTTP POST request arrives: `POST /api/auth/register`
- Body contains: `{ "email": "user@gmail.com", "password": "...", "fullName": "John" }`
- Controller extracts this and calls `_authService.RegisterAsync(...)`

---

### LAYER 2: APPLICATION SERVICE

```csharp
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IAuthIdentityRepository _identityRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ISessionService _sessionService;
    // ... other dependencies

    public async Task<Result<TokenResponse>> RegisterAsync(
        RegisterRequest request,
        string? ip,
        string? ua)
    {
        // BUSINESS LOGIC STEP 1: Validation
        // Check email not already registered
        if (await _userRepo.EmailExistsAsync(request.Email))
            return Result<TokenResponse>.Failure(
                "Email already registered.",
                ResultError.Conflict);
        // ↑ This calls repository layer

        // BUSINESS LOGIC STEP 2: Create domain entities
        var user = new User
        {
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),  // Hash password
            Role = UserRole.User,
        };
        user.Profile = new UserProfile { FullName = request.FullName };

        var identity = new AuthIdentity
        {
            UserId = user.Id,
            Provider = AuthProvider.Email,
            ProviderUserId = request.Email,
        };

        // BUSINESS LOGIC STEP 3: Persist entities
        _userRepo.Add(user);              // Mark for insert
        _identityRepo.Add(identity);      // Mark for insert
        await _unitOfWork.SaveChangesAsync();  // Execute INSERT
        // ↑ This calls repository & unitofwork layers

        // BUSINESS LOGIC STEP 4: Create session
        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        // ↑ Creates AuthSession record

        // BUSINESS LOGIC STEP 5: Generate tokens
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        // ↑ Creates RefreshToken record, generates JWT

        // BUSINESS LOGIC STEP 6: Log event
        await LogEventAsync(user.Id, SecurityEventType.Login, true, ip, ua);
        // ↑ Creates SecurityEvent record

        return Result<TokenResponse>.Success(tokens);
    }
}

// What the service does:
// 1. Validates business rules (email not taken)
// 2. Creates domain entities (User, AuthIdentity)
// 3. Coordinates data persistence (via repositories)
// 4. Orchestrates related operations (session, tokens)
// 5. Returns business result
```

**What happens:**
- Service receives email, password, name from controller
- Checks if email exists (queries Users table)
- Creates entities in memory
- Calls repositories to mark for insertion
- Calls UnitOfWork to save atomically
- Returns tokens to controller

---

### LAYER 3A: REPOSITORIES

```csharp
// IUserRepository interface (contract)
public interface IUserRepository : IRepository<User>
{
    Task<bool> EmailExistsAsync(string email, CancellationToken ct);
}

// EfRepository<User> (generic base)
public class EfRepository<User> : IRepository<User>
{
    protected readonly AppDbContext Db;
    protected readonly DbSet<User> DbSet;

    public EfRepository(AppDbContext db)
    {
        Db = db;
        DbSet = db.Set<User>();  // Get Users DbSet
    }

    public void Add(User entity)
    {
        DbSet.Add(entity);  // Mark entity for insertion
    }
}

// UserRepository (specialized)
public class UserRepository : EfRepository<User>, IUserRepository
{
    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct)
    {
        return await DbSet.AnyAsync(u => u.Email == email, ct);
        // SELECT COUNT(*) FROM Users WHERE Email = @email
    }
}

// What repositories do:
// 1. EmailExistsAsync() → Queries Users table
//    SQL: SELECT COUNT(*) FROM Users WHERE Email = @email
// 2. Add(user) → Marks user for insertion (in memory)
// 3. This gets persisted by UnitOfWork later
```

**Flow:**
1. `_userRepo.EmailExistsAsync(request.Email)` called
2. Repository executes: `DbSet.AnyAsync(u => u.Email == email)`
3. EF translates to SQL and queries database
4. Returns true/false

---

### LAYER 3B: UNIT OF WORK

```csharp
// IUnitOfWork interface (contract)
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);
}

// EfUnitOfWork (implementation)
public class EfUnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _db;
    private IDbContextTransaction? _transaction;

    public EfUnitOfWork(AppDbContext db)
    {
        _db = db;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // Executes all pending changes
        return await _db.SaveChangesAsync(ct);
        // This translates ChangeTracker marks to SQL
        // Executes: INSERT, UPDATE, DELETE statements
    }

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        _transaction = await _db.Database.BeginTransactionAsync(ct);
        // Starts database transaction
    }

    public async Task CommitTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync(ct);
            // Commits all changes to database
        }
    }
}

// What UnitOfWork does:
// 1. Coordinates all pending changes from ChangeTracker
// 2. Executes them atomically (all succeed or all fail)
// 3. Manages transactions (begin/commit/rollback)
```

**Flow:**
1. `await _unitOfWork.SaveChangesAsync()` called
2. UnitOfWork asks DbContext to save
3. DbContext looks at ChangeTracker
4. Finds all marked entities (Added, Modified, Deleted)
5. Generates SQL INSERT/UPDATE/DELETE
6. Executes against database

---

### LAYER 4: ENTITY FRAMEWORK CORE

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // DbSets represent tables
    public DbSet<User> Users => Set<User>();
    public DbSet<AuthIdentity> AuthIdentities => Set<AuthIdentity>();
    public DbSet<MagicLink> MagicLinks => Set<MagicLink>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuthSession> AuthSessions => Set<AuthSession>();
    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Configure entities and relationships
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Add global query filters
        builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Auto-update timestamps before saving
        SetUpdatedAt();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void SetUpdatedAt()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            var prop = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
            if (prop != null)
                prop.CurrentValue = DateTime.UtcNow;
        }
    }
}

// What DbContext does:
// 1. Represents the database schema
// 2. Tracks entity changes (ChangeTracker)
// 3. Translates LINQ to SQL
// 4. Manages transactions
// 5. Handles entity configurations (relationships, constraints)
```

**Key Component: ChangeTracker**

```
BEFORE SaveChangesAsync():

ChangeTracker contains:
  Added:
    - User { Id: "abc123", Email: "user@gmail.com", PasswordHash: "..." }
    - AuthIdentity { UserId: "abc123", Provider: "Email", ... }

SaveChangesAsync() executes:
  1. Generates SQL INSERT statements
  2. Executes INSERT INTO Users (...)
  3. Executes INSERT INTO AuthIdentities (...)
  4. Clears ChangeTracker (entities now unchanged)
```

---

### LAYER 5: DATABASE

```sql
-- What actually happens in MySQL:

-- Transaction starts (if using UnitOfWork.BeginTransaction)
START TRANSACTION;

-- Insert new user
INSERT INTO Users (
    Id, Email, PasswordHash, EmailVerified, Role,
    FailedLoginCount, LockedUntil, SecurityStamp, CreatedAt, UpdatedAt
) VALUES (
    'user_id_123',
    'user@gmail.com',
    '$argon2id$...',
    false,
    'User',
    0,
    NULL,
    'stamp_123',
    '2026-02-28 09:50:00',
    '2026-02-28 09:50:00'
);

-- Insert user profile
INSERT INTO UserProfiles (
    UserId, FullName, AvatarUrl, CreatedAt, UpdatedAt
) VALUES (
    'user_id_123',
    'John Doe',
    NULL,
    '2026-02-28 09:50:00',
    '2026-02-28 09:50:00'
);

-- Insert auth identity
INSERT INTO AuthIdentities (
    Id, UserId, Provider, ProviderUserId, ProviderEmail, LastUsedAt, CreatedAt
) VALUES (
    'identity_123',
    'user_id_123',
    'Email',
    'user@gmail.com',
    'user@gmail.com',
    NULL,
    '2026-02-28 09:50:00'
);

-- Insert session
INSERT INTO AuthSessions (
    Id, UserId, IpAddress, UserAgent, IsActive, CreatedAt
) VALUES (
    'session_123',
    'user_id_123',
    '192.168.1.1',
    'Mozilla/5.0...',
    true,
    '2026-02-28 09:50:00'
);

-- Insert refresh token
INSERT INTO RefreshTokens (
    Id, UserId, SessionId, TokenHash, RevokedAt, CreatedAt, ExpiresAt
) VALUES (
    'token_123',
    'user_id_123',
    'session_123',
    'sha256_hash_...',
    NULL,
    '2026-02-28 09:50:00',
    '2026-03-05 09:50:00'
);

-- Insert security event
INSERT INTO SecurityEvents (
    Id, UserId, EventType, Success, FailureReason, IpAddress, UserAgent, CreatedAt
) VALUES (
    'event_123',
    'user_id_123',
    'Login',
    true,
    NULL,
    '192.168.1.1',
    'Mozilla/5.0...',
    '2026-02-28 09:50:00'
);

-- Commit transaction
COMMIT;

-- All inserts complete successfully, or if any error occurred, ROLLBACK undoes all
```

---

## Complete Flow Diagram: User Registration

```
USER BROWSER
    ↓
POST /api/auth/register
{
  "email": "user@gmail.com",
  "password": "SecurePass123",
  "fullName": "John Doe"
}
    ↓
┌─ LAYER 1: AuthController ──────────────────────────────────┐
│ [HttpPost("register")]                                      │
│ → Extract request body                                      │
│ → Get IP address, User-Agent                                │
│ → Call await _authService.RegisterAsync(...)               │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─ LAYER 2: AuthService ─────────────────────────────────────┐
│ RegisterAsync(email, password, fullName, ip, ua)            │
│                                                             │
│ 1. Validate: await _userRepo.EmailExistsAsync(email)       │
│    ↓ Calls repository                                       │
│    ├─→ Queries: SELECT COUNT(*) WHERE email = @email       │
│    └─ Returns: false (email not taken)                      │
│                                                             │
│ 2. Create entities in memory:                              │
│    user = new User { Email, PasswordHash, ... }            │
│    identity = new AuthIdentity { ... }                     │
│                                                             │
│ 3. Mark for insertion:                                     │
│    _userRepo.Add(user)       → ChangeTracker: Added        │
│    _identityRepo.Add(identity) → ChangeTracker: Added      │
│                                                             │
│ 4. Save atomically:                                        │
│    await _unitOfWork.SaveChangesAsync()                    │
│    ↓ Calls UnitOfWork                                      │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─ LAYER 3A: Repositories ───────────────────────────────────┐
│ Add(user) → DbSet.Add(user)                                │
│ Add(identity) → DbSet.Add(identity)                        │
│                                                             │
│ Both entities marked in ChangeTracker as "Added"            │
│ NOT yet in database                                         │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─ LAYER 3B: UnitOfWork ─────────────────────────────────────┐
│ SaveChangesAsync()                                          │
│ ↓ Calls DbContext.SaveChangesAsync()                       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─ LAYER 4: DbContext ───────────────────────────────────────┐
│ SaveChangesAsync()                                          │
│                                                             │
│ ChangeTracker.Entries() returns:                           │
│   [Added] User { ... }                                      │
│   [Added] AuthIdentity { ... }                             │
│                                                             │
│ Translate to SQL:                                          │
│   INSERT INTO Users (...)                                   │
│   INSERT INTO AuthIdentities (...)                         │
│                                                             │
│ Execute via Database provider (MySql)                       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─ LAYER 5: MySQL Database ──────────────────────────────────┐
│ Receive SQL statements from EF                             │
│                                                             │
│ BEGIN TRANSACTION;                                          │
│   INSERT INTO Users VALUES (...)                           │
│   INSERT INTO AuthIdentities VALUES (...)                  │
│ COMMIT;                                                     │
│                                                             │
│ Both rows now permanently in database                       │
└─────────────────────────────────────────────────────────────┘
    ↓
Return to AuthService (back in LAYER 2)
│
├─ Continue: Create session                                   │
│   await _sessionService.CreateSessionAsync(...)             │
│   ↓ Inserts AuthSession record                             │
│                                                             │
├─ Generate tokens                                            │
│   await _tokenService.GenerateTokenPairAsync(...)          │
│   ↓ Inserts RefreshToken record                            │
│                                                             │
├─ Log event                                                  │
│   await LogEventAsync(...)                                  │
│   ↓ Inserts SecurityEvent record                           │
│                                                             │
└─ Return: Result<TokenResponse>.Success(tokens)             │
    ↓
Return to AuthController (back in LAYER 1)
│
└─ Return HTTP 200 OK
   {
     "accessToken": "eyJhbGc...",
     "refreshToken": "...",
     "expiresIn": 3600,
     "tokenType": "Bearer"
   }
    ↓
Return to USER BROWSER
```

---

## Key Architectural Principles

### 1. Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| **Controller** | HTTP handling, request/response mapping |
| **Service** | Business logic, validation, orchestration |
| **Repository** | Data access queries and mutations |
| **UnitOfWork** | Transaction management |
| **DbContext** | Entity mapping, SQL translation |
| **Database** | Data persistence |

### 2. Dependency Direction (Dependency Inversion)

```
Controller
    ↓ depends on
IAuthService (interface)
    ↓ implemented by
AuthService
    ↓ depends on
IUserRepository, IUnitOfWork (interfaces)
    ↓ implemented by
EfRepository<User>, EfUnitOfWork
    ↓ use
AppDbContext
    ↓ talks to
Database

KEY: High-level modules depend on interfaces, not concrete implementations
This allows swapping implementations without changing code above
```

### 3. Data Flow

```
DOWN (Command Flow):
AuthService → Repositories → UnitOfWork → DbContext → Database

UP (Query Results):
Database → DbContext → Repositories → AuthService → Controller → Client
```

### 4. Atomicity (All-or-Nothing)

```
Without UnitOfWork:
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Add user│  │Add ident│  │Add event│
└────┬────┘  └────┬────┘  └────┬────┘
     ↓            ↓            ↓
  Saved        Saved         FAILS!
                               ↑
                    User already in DB
                    Identity already in DB
                    Event never created
                    INCONSISTENT STATE!

With UnitOfWork:
┌──────────────────────────────────────┐
│      All changes marked              │
│  (Add user, Add identity, Add event) │
└────────────────────┬─────────────────┘
                     ↓
            _unitOfWork.SaveChangesAsync()
                     ↓
     ┌───────────────────────────────┐
     │  BEGIN TRANSACTION             │
     │  INSERT user                   │
     │  INSERT identity               │
     │  INSERT event                  │
     │  COMMIT (all succeed together) │
     │  OR ROLLBACK (all fail)        │
     └───────────────────────────────┘
                     ↓
            NO INCONSISTENT STATE!
```

---

## Why This Architecture?

### Maintainability
- Each layer has single responsibility
- Easy to understand what happens where
- Easy to change implementation details

### Testability
- Mock repositories and UnitOfWork in tests
- Test business logic without database
- Test different scenarios easily

### Security
- Atomic operations prevent race conditions
- Transactions ensure consistency
- Hashing and token handling in service layer

### Scalability
- Can swap EF with different ORM
- Can swap MySQL with different database
- Can add caching layer without changing services
- Can implement CQRS later if needed

---

## The Contract Model

```csharp
// CONTRACTS (Interfaces) - These define the "contract"
public interface IAuthService { /* methods */ }
public interface IUserRepository : IRepository<User> { /* methods */ }
public interface IUnitOfWork { /* methods */ }

// IMPLEMENTATIONS - These implement the contract
public class AuthService : IAuthService { /* implementation */ }
public class UserRepository : EfRepository<User>, IUserRepository { /* impl */ }
public class EfUnitOfWork : IUnitOfWork { /* implementation */ }

// KEY INSIGHT:
// - High layers depend on interfaces (contracts)
// - Low layers implement interfaces
// - This inverts the dependency!
// - Without this:
//   AuthService would depend on AuthRepository (tight coupling)
// - With this:
//   AuthService depends on IAuthRepository (loose coupling)
```

---

## Summary

**AuthService Architecture = Clean Layered Pattern**

```
Presentation ← HTTP
    ↓
Application ← Business Logic
    ↓
Data Access ← Repositories & UnitOfWork
    ↓
Persistence ← Database
```

Each layer:
1. Depends on layers below through interfaces
2. Never depends on layers above
3. Has clear single responsibility
4. Can be tested independently
5. Can be swapped for alternative implementation

This is why TicketStar's architecture is professional and scalable! 🎯
