# Entity Framework & Unit of Work Pattern in TicketStar

## Overview: What is Entity Framework (EF)?

Entity Framework is an **Object-Relational Mapping (ORM)** library. It lets you work with databases using C# objects instead of writing raw SQL.

**Without EF (Raw SQL):**

```csharp
using (var connection = new MySqlConnection(connStr))
{
    connection.Open();
    var cmd = connection.CreateCommand();
    cmd.CommandText = "SELECT * FROM Users WHERE Id = @id";
    cmd.Parameters.AddWithValue("@id", userId);
    var reader = cmd.ExecuteReader();
    // Parse result...
}
```

**With EF (Object-based):**

```csharp
var user = await userRepository.GetByIdAsync(userId);
```

Much cleaner! EF handles the SQL generation, parameters, result mapping automatically.

---

## Architecture: How EF is Organized in TicketStar

```
┌─────────────────────────────────────────────────────────────┐
│ API Layer (Controllers)                                      │
│  └─ AuthController, EventController, etc.                    │
└──────────────┬──────────────────────────────────────────────┘
               │ (inject repositories)
               ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer (Services)                                 │
│  └─ AuthService, EventService, etc.                          │
│     (business logic, validation)                             │
└──────────────┬──────────────────────────────────────────────┘
               │ (inject repositories + IUnitOfWork)
               ↓
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer (Repositories)                          │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ IRepository<T>  (interface)                          │    │
│  └──────────────────────────────────────────────────────┘    │
│           ↑                                                    │
│           │ (implemented by)                                  │
│           │                                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ EfRepository<T> (generic repo base class)            │    │
│  │  ├─ GetByIdAsync(id)                                 │    │
│  │  ├─ FirstOrDefaultAsync(predicate)                   │    │
│  │  ├─ ListAsync(predicate)                             │    │
│  │  ├─ Add(entity)                                      │    │
│  │  ├─ Update(entity)                                   │    │
│  │  └─ Remove(entity)                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│           ↑                                                    │
│           │ (inherited by specialized repos)                 │
│           │                                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ UserRepository : EfRepository<User>                  │    │
│  │ EventRepository : EfRepository<Event>                │    │
│  │ OrderRepository : EfRepository<Order>                │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                    │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ IUnitOfWork (transaction coordinator)                │    │
│  │  ├─ SaveChangesAsync()                               │    │
│  │  ├─ BeginTransactionAsync()                          │    │
│  │  ├─ CommitTransactionAsync()                         │    │
│  │  └─ RollbackTransactionAsync()                       │    │
│  └──────────────────────────────────────────────────────┘    │
│           ↑                                                    │
│           │ (implemented by)                                  │
│           │                                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ EfUnitOfWork (wraps AppDbContext)                    │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                    │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ AppDbContext : DbContext                             │    │
│  │ (represents entire database)                         │    │
│  │                                                       │    │
│  │  public DbSet<User> Users                            │    │
│  │  public DbSet<Event> Events                          │    │
│  │  public DbSet<Order> Orders                          │    │
│  │  ...                                                  │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────────────┐
│ Database (MySQL)                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. AppDbContext - The Database Representation

**File:** `Infrastructure/Data/AppDbContext.cs`

This class represents your entire database in code:

```csharp
public class AppDbContext : DbContext
{
    // Constructor takes DbContextOptions (configured in Program.cs)
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // DbSet = a "table" for querying/modifying that entity type
    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    // ... more tables
```

**What is DbSet?**

- `DbSet<User>` = collection representing the Users table
- You query it: `DbSet.Where(u => u.Email == "...").ToListAsync()`
- You add to it: `DbSet.Add(newUser)` then `SaveChangesAsync()`

**The `OnModelCreating` method:**

```csharp
protected override void OnModelCreating(ModelBuilder builder)
{
    // Apply all configuration classes (entity mappings, relationships, constraints)
    builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    // Global query filter: exclude soft-deleted users
    builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);
}
```

**The `SaveChangesAsync` override:**

```csharp
public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
{
    SetUpdatedAt();  // Auto-update "UpdatedAt" timestamp on modified entities
    return base.SaveChangesAsync(cancellationToken);
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
```

This automatically timestamps every update!

---

### 2. IRepository<T> - Generic Data Access Interface

**File:** `Domain/Interfaces/IRepository.cs`

Defines the contract for accessing any entity:

```csharp
public interface IRepository<T> where T : class
{
    // Read operations
    Task<T?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    // Write operations (deferred - don't hit DB until SaveChangesAsync)
    void Add(T entity);
    void Update(T entity);
    void Remove(T entity);

    // Advanced
    Task ReloadAsync(T entity, CancellationToken ct = default);
    IQueryable<T> Query();          // Advanced LINQ queries
    IQueryable<T> QueryIgnoreFilters();  // Bypass global filters (e.g., soft-delete)
}
```

**Why this interface?**

- Abstracts database implementation (could swap EF for another ORM)
- Makes testing easier (mock the interface)
- Consistent API across all repositories

---

### 3. EfRepository<T> - Generic Implementation

**File:** `Infrastructure/Repositories/EfRepository.cs`

This is the **base class** for all repositories - implements IRepository<T> using EF:

```csharp
public class EfRepository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext Db;
    protected readonly DbSet<T> DbSet;

    public EfRepository(AppDbContext db)
    {
        Db = db;
        DbSet = db.Set<T>();  // Get the DbSet for this entity type
    }

    // Example: GetByIdAsync
    public async Task<T?> GetByIdAsync(string id, CancellationToken ct = default)
        => await DbSet.FindAsync(new object[] { id }, ct);
    // FindAsync: queries DB by primary key, checks cache first

    // Example: ListAsync with optional filter
    public async Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null,
                                         CancellationToken ct = default)
        => predicate is null
            ? await DbSet.ToListAsync(ct)              // No filter: get all
            : await DbSet.Where(predicate).ToListAsync(ct);  // With filter: apply predicate

    // Add: marks entity as new (INSERT on SaveChanges)
    public void Add(T entity) => DbSet.Add(entity);

    // Update: marks entity as modified (UPDATE on SaveChanges)
    public void Update(T entity) => DbSet.Update(entity);

    // Remove: marks entity as deleted (DELETE on SaveChanges)
    public void Remove(T entity) => DbSet.Remove(entity);

    // Query: return raw IQueryable for advanced LINQ
    public IQueryable<T> Query() => DbSet.AsQueryable();

    // QueryIgnoreFilters: bypass global query filters
    public IQueryable<T> QueryIgnoreFilters() => DbSet.IgnoreQueryFilters();
}
```

**Key insight:** `Add`, `Update`, `Remove` don't immediately hit the database. They just mark changes in memory. The DB is only updated when you call `SaveChangesAsync()`.

---

### 4. Specialized Repositories (UserRepository Example)

**File:** `Infrastructure/Repositories/UserRepository.cs`

Inherits from `EfRepository<User>` and adds **custom domain-specific queries**:

```csharp
public class UserRepository : EfRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext db) : base(db) { }

    // Custom query: find by email (not just by ID)
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(u => u.Email == email, ct);

    // Custom query: find by email ignoring soft-delete filter
    public async Task<User?> GetByEmailIgnoreFiltersAsync(string email, CancellationToken ct = default)
        => await DbSet.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email, ct);

    // Check if email already exists
    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await DbSet.IgnoreQueryFilters().AnyAsync(u => u.Email == email, ct);

    // Atomic update: increment failed login count directly in DB
    public async Task IncrementFailedLoginAsync(string userId, CancellationToken ct = default)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.FailedLoginCount,
                                                   u => u.FailedLoginCount + 1), ct);
    // ExecuteUpdateAsync: runs UPDATE SQL directly (faster than fetch-modify-save)

    // Lock account until a specific time
    public async Task LockAccountAsync(string userId, DateTime until, CancellationToken ct = default)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedUntil, until), ct);
}
```

**Why specialize?**

- Add queries specific to your domain (GetByEmail for User)
- Optimize with `ExecuteUpdateAsync` (direct SQL) instead of load-modify-save

---

### 5. IUnitOfWork - Transaction Coordinator

**File:** `Domain/Interfaces/IUnitOfWork.cs`

Manages **transactions** - groups multiple DB operations into atomic units:

```csharp
public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);
}
```

**Transaction = All-or-Nothing**

- If any operation fails, **all** changes are rolled back
- Example: Creating an order with payment - both must succeed or both fail

---

### 6. EfUnitOfWork - Transaction Implementation

**File:** `Infrastructure/Repositories/EfUnitOfWork.cs`

Wraps `AppDbContext` to provide transaction support:

```csharp
public class EfUnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _db;
    private IDbContextTransaction? _transaction;

    public EfUnitOfWork(AppDbContext db) => _db = db;

    // Save all pending changes to database
    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);

    // Start a transaction
    public async Task BeginTransactionAsync(CancellationToken ct = default)
        => _transaction = await _db.Database.BeginTransactionAsync(ct);

    // Commit (finalize) the transaction
    public async Task CommitTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction is not null)
        {
            await _transaction.CommitAsync(ct);     // Commit to DB
            await _transaction.DisposeAsync();       // Clean up
            _transaction = null;
        }
    }

    // Rollback (undo) the transaction
    public async Task RollbackTransactionAsync(CancellationToken ct = default)
    {
        if (_transaction is not null)
        {
            await _transaction.RollbackAsync(ct);   // Undo all changes
            await _transaction.DisposeAsync();      // Clean up
            _transaction = null;
        }
    }
}
```

---

## How to Use EF in TicketStar

### Setup (Program.cs)

```csharp
var connStr = builder.Configuration.GetConnectionString("MySqlConnection")!;

// Register AppDbContext with dependency injection
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

// Register repositories
builder.Services.AddRepositories();  // Extension method (adds all repos to DI)

// Register UnitOfWork
builder.Services.AddScoped<IUnitOfWork, EfUnitOfWork>();
```

**Lifetime: Scoped**

- One instance **per HTTP request**
- Ensures changes from one request don't leak to another

---

### Usage Example: AuthService

```csharp
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest req, CancellationToken ct)
    {
        // Step 1: Find user by email
        var user = await _userRepository.GetByEmailAsync(req.Email, ct);
        if (user is null)
            return Result<LoginResponse>.Fail("User not found", ResultError.NotFound);

        // Step 2: Verify password
        if (!_passwordHasher.Verify(user.PasswordHash, req.Password))
        {
            // Increment failed attempts
            await _userRepository.IncrementFailedLoginAsync(user.Id, ct);
            // SaveChanges applied by transaction
            return Result<LoginResponse>.Fail("Invalid password", ResultError.Unauthorized);
        }

        // Step 3: Create session
        var session = AuthSession.Create(user.Id, "user-agent");
        user.AuthSessions.Add(session);  // Add to user's collection

        // Step 4: Save all changes atomically
        await _unitOfWork.SaveChangesAsync(ct);

        // Step 5: Return token
        return Result<LoginResponse>.Ok(new LoginResponse(token, user.Id));
    }
}
```

**Flow:**

1. Query: `GetByEmailAsync()` → fetches from DB
2. Modify: Create new session, add to user's collection
3. Persist: `SaveChangesAsync()` → writes to DB

---

### Usage Example: Transaction

```csharp
public async Task<Result> CreateOrderAsync(CreateOrderRequest req, CancellationToken ct)
{
    try
    {
        // Start transaction - all operations below are grouped
        await _unitOfWork.BeginTransactionAsync(ct);

        // Operation 1: Create order
        var order = Order.Create(req.UserId, req.Items);
        _orderRepository.Add(order);
        await _unitOfWork.SaveChangesAsync(ct);

        // Operation 2: Create payment
        var payment = Payment.Create(order.Id, req.Amount);
        _paymentRepository.Add(payment);
        await _unitOfWork.SaveChangesAsync(ct);

        // Operation 3: Update inventory
        foreach (var item in req.Items)
        {
            await _ticketRepository.DecrementStockAsync(item.TicketTypeId, item.Quantity, ct);
        }
        await _unitOfWork.SaveChangesAsync(ct);

        // All succeeded - commit
        await _unitOfWork.CommitTransactionAsync(ct);
        return Result.Ok();
    }
    catch (Exception ex)
    {
        // Any error - rollback everything
        await _unitOfWork.RollbackTransactionAsync(ct);
        return Result.Fail($"Order creation failed: {ex.Message}", ResultError.Internal);
    }
}
```

**If operation 2 fails:**

- Order is not in DB (rolled back)
- Payment is not in DB (rolled back)
- Inventory unchanged (rolled back)
- **All-or-nothing guarantee!**

---

## Key EF Concepts

### 1. ChangeTracker - Tracks Changes in Memory

```
Before SaveChangesAsync():
┌──────────────────────────────┐
│ ChangeTracker (in memory)    │
├──────────────────────────────┤
│ Added:   new User{ }         │
│ Modified: user (changed)      │
│ Deleted:  user (marked)      │
│ Unchanged: ...other entities │
└──────────────────────────────┘

SaveChangesAsync() executes SQL:
- INSERT for Added entities
- UPDATE for Modified entities
- DELETE for Deleted entities
```

### 2. Deferred Execution - Query Runs Only When Needed

```csharp
// These DON'T query the database yet:
IQueryable<User> query = _userRepository.Query()
    .Where(u => u.Email == "...@gmail.com")
    .OrderBy(u => u.CreatedAt);

// This DOES query the database (ToListAsync forces execution):
List<User> users = await query.ToListAsync(ct);
```

### 3. Entity States

```
New (Added)      → Not in DB yet, will be INSERT on SaveChanges
Unchanged        → In DB, no changes, nothing will happen on SaveChanges
Modified         → In DB, has changes, will be UPDATE on SaveChanges
Deleted (Removed)→ Will be DELETE on SaveChanges
Detached         → Not tracked (doesn't exist in current DbContext)
```

### 4. Query Filters - Auto-Filter All Queries

```csharp
// In OnModelCreating:
builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);

// Now every query automatically filters out soft-deleted users:
var users = await _userRepository.ListAsync();
// Behind the scenes: SELECT * FROM Users WHERE DeletedAt IS NULL

// To bypass the filter:
var allUsers = await _userRepository.QueryIgnoreFilters().ToListAsync();
// SELECT * FROM Users (no filter)
```

---

## Dependency Injection Flow

```
1. Program.cs registers:
   builder.Services.AddDbContext<AppDbContext>(...)
   builder.Services.AddScoped<IRepository<>, EfRepository<>>()
   builder.Services.AddScoped<IUserRepository, UserRepository>()
   builder.Services.AddScoped<IUnitOfWork, EfUnitOfWork>()

2. HTTP Request arrives:

   3. Controller needs AuthService:
      [HttpPost("login")]
      public async Task<IActionResult> Login([FromBody] LoginRequest req)
      {
          // ASP.NET creates AuthService automatically:
          var service = new AuthService(userRepository, unitOfWork);
      }

   4. AuthService needs IUserRepository + IUnitOfWork:
      public AuthService(IUserRepository userRepository, IUnitOfWork unitOfWork)
      {
          // DI provides:
          _userRepository = new UserRepository(dbContext);
          _unitOfWork = new EfUnitOfWork(dbContext);
      }

   5. UserRepository needs AppDbContext:
      public UserRepository(AppDbContext db) : base(db)
      {
          // DI provides the configured DbContext
      }

   6. Service uses repository:
      var user = await _userRepository.GetByEmailAsync(email, ct);

   7. Request ends:
      // AppDbContext is disposed automatically
      // New request = new DbContext instance
```

---

## Common EF Operations

### Query Operations

```csharp
// Get by ID
var user = await repo.GetByIdAsync("user-123");

// Get first match
var user = await repo.FirstOrDefaultAsync(u => u.Email == "...@gmail.com");

// Get all matching
var users = await repo.ListAsync(u => u.IsActive);

// Check if any match
var exists = await repo.AnyAsync(u => u.Email == email);

// Advanced: complex LINQ query
var result = await repo.Query()
    .Where(u => u.CreatedAt > DateTime.UtcNow.AddMonths(-1))
    .OrderByDescending(u => u.CreatedAt)
    .Take(10)
    .ToListAsync();
```

### Write Operations

```csharp
// Add new entity
var user = User.Create(email, password);
repo.Add(user);
await unitOfWork.SaveChangesAsync();

// Update entity
user.Email = "new@email.com";
repo.Update(user);
await unitOfWork.SaveChangesAsync();

// Delete entity
repo.Remove(user);
await unitOfWork.SaveChangesAsync();

// Bulk update (direct SQL - more efficient)
await repo.Query()
    .Where(u => u.IsActive == false)
    .ExecuteUpdateAsync(s => s.SetProperty(u => u.DeletedAt, DateTime.UtcNow));
```

---

## Summary

| Component             | Purpose                                  | Location                       |
| --------------------- | ---------------------------------------- | ------------------------------ |
| **AppDbContext**      | Represents database, holds DbSets        | `Infrastructure/Data/`         |
| **IRepository<T>**    | Interface for data access                | `Domain/Interfaces/`           |
| **EfRepository<T>**   | Generic implementation using EF          | `Infrastructure/Repositories/` |
| **Specialized Repos** | Domain-specific queries (UserRepository) | `Infrastructure/Repositories/` |
| **IUnitOfWork**       | Transaction coordinator interface        | `Domain/Interfaces/`           |
| **EfUnitOfWork**      | Transaction implementation               | `Infrastructure/Repositories/` |

**Key Takeaway:** EF + Repository Pattern = Clean, testable, transaction-safe data access
