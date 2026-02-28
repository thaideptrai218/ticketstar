# EfRepository Class & IRepository Interface - Complete Guide

## The Problem EfRepository Solves

Normally with EF Core, you'd use DbContext directly:

```csharp
// ❌ Direct DbContext - verbose, repetitive
var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
var orders = await _db.Orders.Where(o => o.Status == "Active").ToListAsync();
var exists = await _db.Tickets.AnyAsync(t => t.Id == ticketId);
_db.Users.Add(newUser);
await _db.SaveChangesAsync();
```

**Problems:**
- Repeating same patterns everywhere
- No abstraction layer
- Hard to test
- Tight coupling to EF

---

## Architecture: IRepository + EfRepository

```
┌─────────────────────────────────────────────────────────┐
│ IRepository<T> (Interface)                               │
│ Location: Domain/Interfaces/                             │
├─────────────────────────────────────────────────────────┤
│ Defines contract (what methods exist)                    │
│  ├─ GetByIdAsync(id)                                    │
│  ├─ FirstOrDefaultAsync(predicate)                      │
│  ├─ ListAsync(predicate)                                │
│  ├─ Add(entity), Update(entity), Remove(entity)         │
│  ├─ Query(), QueryIgnoreFilters()                       │
│  └─ ReloadAsync(entity)                                 │
└─────────────────────────────────────────────────────────┘
                        ↑
                  (implemented by)
                        │
┌─────────────────────────────────────────────────────────┐
│ EfRepository<T> (Generic Base Class)                    │
│ Location: Infrastructure/Repositories/                   │
├─────────────────────────────────────────────────────────┤
│ Implements IRepository<T> for ANY entity using EF Core  │
│  ├─ Wraps DbSet<T> operations                           │
│  ├─ Uses EntityFrameworkCore                            │
│  ├─ Provides standard data access patterns              │
│  └─ Works for: User, Event, Order, Ticket, etc.        │
└─────────────────────────────────────────────────────────┘
                        ↑
                  (inherited by)
                        │
┌─────────────────────────────────────────────────────────┐
│ Specialized Repositories (Optional)                      │
│ Location: Infrastructure/Repositories/                   │
├─────────────────────────────────────────────────────────┤
│ UserRepository : EfRepository<User>, IUserRepository    │
│  ├─ Inherits all generic methods                        │
│  ├─ Adds domain-specific queries:                       │
│  │   - GetByEmailAsync()                                │
│  │   - EmailExistsAsync()                               │
│  │   - IncrementFailedLoginAsync()                      │
│  └─ Still uses EF Core (same as base class)             │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: IRepository<T> Interface

**File:** `Domain/Interfaces/IRepository.cs`

### What It Is

A **generic contract** that defines the standard data access operations for ANY entity type:

```csharp
public interface IRepository<T> where T : class
{
    // Query operations (read from DB)
    Task<T?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);

    // Modify operations (change in memory, save later)
    void Add(T entity);
    void Update(T entity);
    void Remove(T entity);

    // Advanced operations
    Task ReloadAsync(T entity, CancellationToken ct = default);
    IQueryable<T> Query();
    IQueryable<T> QueryIgnoreFilters();
}
```

### Why Generic?

The `<T>` type parameter means **one interface works for all entities**:

```
IRepository<User>   ← Interface for User entity
IRepository<Event>  ← Interface for Event entity
IRepository<Order>  ← Interface for Order entity
IRepository<Ticket> ← Interface for Ticket entity
```

This is **not three different interfaces**—it's one template that adapts to any type!

---

## Part 2: EfRepository<T> Class

**File:** `Infrastructure/Repositories/EfRepository.cs`

### What It Is

The **implementation** of `IRepository<T>` that uses Entity Framework Core to talk to the database:

```csharp
public class EfRepository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext Db;      // The DbContext
    protected readonly DbSet<T> DbSet;       // The table for this entity type

    public EfRepository(AppDbContext db)
    {
        Db = db;
        DbSet = db.Set<T>();  // Get DbSet<T> from context
    }

    // ... implementations of all interface methods
}
```

### How It Works

**Step 1: Constructor**
```csharp
public EfRepository(AppDbContext db)
{
    Db = db;                  // Store reference to DbContext
    DbSet = db.Set<T>();     // Get the DbSet for type T
}
```

When you create `new EfRepository<User>(dbContext)`:
- `Db` = the `AppDbContext` instance
- `DbSet` = `AppDbContext.Users` (the DbSet<User>)

**Step 2: Using DbSet to Query**

The methods use `DbSet` to build queries:

```csharp
// GetByIdAsync uses FindAsync
public async Task<T?> GetByIdAsync(string id, CancellationToken ct = default)
    => await DbSet.FindAsync(new object[] { id }, ct);
// Translates to: SELECT * FROM [Table] WHERE Id = @id

public async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
    => await DbSet.FindAsync(new object[] { id }, ct);
// Overloaded: works with both string and Guid IDs

// FirstOrDefaultAsync with filter
public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
    => await DbSet.FirstOrDefaultAsync(predicate, ct);
// Translates to: SELECT TOP 1 * FROM [Table] WHERE [predicate]
// Example: await repo.FirstOrDefaultAsync(u => u.Email == "test@gmail.com")

// ListAsync with optional filter
public async Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default)
    => predicate is null
        ? await DbSet.ToListAsync(ct)                    // No filter
        : await DbSet.Where(predicate).ToListAsync(ct);  // With filter
// Translates to: SELECT * FROM [Table] WHERE [predicate]

// AnyAsync - check if any match
public async Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
    => await DbSet.AnyAsync(predicate, ct);
// Translates to: SELECT COUNT(*) FROM [Table] WHERE [predicate]
```

**Step 3: Modifying Data**

```csharp
// Add marks entity as new (INSERT on SaveChanges)
public void Add(T entity) => DbSet.Add(entity);

// Update marks entity as modified (UPDATE on SaveChanges)
public void Update(T entity) => DbSet.Update(entity);

// Remove marks entity for deletion (DELETE on SaveChanges)
public void Remove(T entity) => DbSet.Remove(entity);
```

**Important:** These don't hit the DB immediately! They mark changes in memory.

```csharp
var user = new User { Email = "test@gmail.com" };
_repo.Add(user);  // ← User is in memory, NOT in DB yet

await _unitOfWork.SaveChangesAsync();  // ← NOW it's inserted
```

**Step 4: Advanced Operations**

```csharp
// Reload entity from DB (discard in-memory changes)
public async Task ReloadAsync(T entity, CancellationToken ct = default)
    => await Db.Entry(entity).ReloadAsync(ct);

// Return raw IQueryable for complex LINQ
public IQueryable<T> Query() => DbSet.AsQueryable();
// Usage:
var result = await repo.Query()
    .Where(u => u.CreatedAt > DateTime.UtcNow.AddMonths(-1))
    .OrderByDescending(u => u.CreatedAt)
    .Take(10)
    .ToListAsync();

// Bypass global query filters (e.g., soft-delete)
public IQueryable<T> QueryIgnoreFilters() => DbSet.IgnoreQueryFilters();
// Usage: Find soft-deleted users
var deletedUsers = await repo.QueryIgnoreFilters()
    .Where(u => u.DeletedAt != null)
    .ToListAsync();
```

---

## Part 3: Using EfRepository with EF Core

### How It Connects to DbContext

```
Your Service
    ↓ (inject)
IRepository<T>
    ↓ (interface resolved by DI)
EfRepository<T> (concrete class)
    ↓ (constructor needs)
AppDbContext (the DbContext)
    ↓ (DbContext connects to)
Database (MySQL)
```

### The Complete Flow: Adding a User

```csharp
// Step 1: Inject repository in your service
public class AuthService : IAuthService
{
    private readonly IRepository<User> _userRepository;  // ← Generic interface
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(IRepository<User> userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;  // DI provides EfRepository<User>
        _unitOfWork = unitOfWork;
    }

    public async Task RegisterAsync(RegisterRequest req, CancellationToken ct)
    {
        // Step 2: Create entity
        var user = User.Create(req.Email, req.Password);

        // Step 3: Add to repository (in memory)
        _userRepository.Add(user);
        //        ↓
        // DbSet<User>.Add(user) called internally
        // ↓
        // User marked as "Added" in ChangeTracker

        // Step 4: Save to database
        await _unitOfWork.SaveChangesAsync(ct);
        //        ↓
        // AppDbContext.SaveChangesAsync() called
        // ↓
        // Executes: INSERT INTO Users (Email, Password, ...) VALUES (...)
        // ↓
        // User now in database with generated ID
    }
}
```

### Query Example with Predicate

```csharp
public class EventService : IEventService
{
    private readonly IRepository<Event> _eventRepository;

    public EventService(IRepository<Event> eventRepository)
    {
        _eventRepository = eventRepository;
    }

    public async Task<List<Event>> GetUpcomingEventsAsync(CancellationToken ct)
    {
        // Use ListAsync with a filter predicate
        var upcomingEvents = await _eventRepository.ListAsync(
            e => e.StartDate > DateTime.UtcNow && e.IsActive,
            ct
        );
        //                     ↑ Predicate (LINQ expression)
        //                       Translates to SQL WHERE clause

        // Behind the scenes:
        // WHERE StartDate > @now AND IsActive = true

        return upcomingEvents;
    }

    public async Task<Event?> GetEventDetailsAsync(string eventId, CancellationToken ct)
    {
        // Use GetByIdAsync for primary key lookup
        var eventDetails = await _eventRepository.GetByIdAsync(eventId, ct);
        // Translates to: SELECT * FROM Events WHERE Id = @id
        // FindAsync also checks cache first (performance!)

        return eventDetails;
    }

    public async Task<bool> IsEventNameTakenAsync(string name, CancellationToken ct)
    {
        // Use AnyAsync to check existence
        var exists = await _eventRepository.AnyAsync(e => e.Name == name, ct);
        // Translates to: SELECT COUNT(*) FROM Events WHERE Name = @name

        return exists;
    }
}
```

---

## Part 4: Extending with Specialized Repositories

For entities with **domain-specific queries**, create a specialized repository:

### Step 1: Create Specialized Interface

```csharp
// File: Domain/Interfaces/IUserRepository.cs

public interface IUserRepository : IRepository<User>
{
    // Inherit all generic methods from IRepository<User>
    // Add custom methods specific to User domain

    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<User?> GetByEmailIgnoreFiltersAsync(string email, CancellationToken ct);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct);
    Task IncrementFailedLoginAsync(string userId, CancellationToken ct);
    Task LockAccountAsync(string userId, DateTime until, CancellationToken ct);
}
```

### Step 2: Create Implementation

```csharp
// File: Infrastructure/Repositories/UserRepository.cs

public class UserRepository : EfRepository<User>, IUserRepository
{
    // Constructor
    public UserRepository(AppDbContext db) : base(db) { }
    // ↑ Calls EfRepository<User> constructor with DbContext
    // ↑ Now we have access to: Db, DbSet (inherited)

    // Custom method: Query by email
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(u => u.Email == email, ct);
    // Uses DbSet (inherited from EfRepository<User>)

    // Custom method: Check existence ignoring soft-delete
    public async Task<User?> GetByEmailIgnoreFiltersAsync(string email, CancellationToken ct = default)
        => await DbSet.IgnoreQueryFilters()  // Bypass global filters
            .FirstOrDefaultAsync(u => u.Email == email, ct);

    // Custom method: Check if email exists
    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await DbSet.IgnoreQueryFilters()
            .AnyAsync(u => u.Email == email, ct);

    // Custom method: Security - increment failed logins
    public async Task IncrementFailedLoginAsync(string userId, CancellationToken ct = default)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(
                s => s.SetProperty(u => u.FailedLoginCount, u => u.FailedLoginCount + 1),
                ct
            );
    // ExecuteUpdateAsync: Direct SQL UPDATE (faster, no load-modify-save)

    // Custom method: Lock account after multiple failed attempts
    public async Task LockAccountAsync(string userId, DateTime until, CancellationToken ct = default)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedUntil, until), ct);
}
```

### Step 3: Register in DI

```csharp
// File: API/Extensions/ServiceCollectionExtensions.cs

public static IServiceCollection AddRepositories(this IServiceCollection services)
{
    services.AddScoped<IUnitOfWork, EfUnitOfWork>();

    // Generic registration (works for ALL entities)
    services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

    // Specialized registration (override for User)
    services.AddScoped<IUserRepository, UserRepository>();

    return services;
}
```

### Step 4: Use in Service

```csharp
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;  // ← Specialized interface!

    public AuthService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
        // DI provides UserRepository instance
    }

    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest req, CancellationToken ct)
    {
        // Use generic method (inherited from IRepository<User>)
        var user = await _userRepository.FirstOrDefaultAsync(
            u => u.Email == req.Email,
            ct
        );

        if (user == null)
            return Result<LoginResponse>.Fail("User not found", ResultError.NotFound);

        // Use custom method (added in IUserRepository)
        var exists = await _userRepository.EmailExistsAsync(req.Email, ct);

        // Use custom method (added in IUserRepository)
        await _userRepository.IncrementFailedLoginAsync(user.Id, ct);

        if (user.FailedLoginCount > 5)
            await _userRepository.LockAccountAsync(user.Id, DateTime.UtcNow.AddHours(1), ct);

        await _unitOfWork.SaveChangesAsync(ct);

        return Result<LoginResponse>.Ok(new LoginResponse(...));
    }
}
```

---

## Part 5: EfRepository Methods Reference

### Read Operations (Query Database)

```csharp
// Get single by primary key
var user = await repo.GetByIdAsync("user-123", ct);     // string ID
var user = await repo.GetByIdAsync(Guid.Parse(...), ct); // Guid ID

// Get first match or null
var user = await repo.FirstOrDefaultAsync(u => u.Email == "test@gmail.com", ct);
var order = await repo.FirstOrDefaultAsync(o => o.Status == "Pending", ct);

// Get all (optional filter)
var users = await repo.ListAsync(ct);                    // All users
var users = await repo.ListAsync(u => u.IsActive, ct);   // Active users only

// Check existence
var exists = await repo.AnyAsync(u => u.Email == email, ct);
var hasPending = await repo.AnyAsync(o => o.Status == "Pending", ct);
```

### Write Operations (Deferred - Save Later)

```csharp
// Create new entity
var user = new User { Email = "test@gmail.com" };
repo.Add(user);
await unitOfWork.SaveChangesAsync(ct);  // INSERT

// Modify existing entity
user.Email = "newemail@gmail.com";
repo.Update(user);
await unitOfWork.SaveChangesAsync(ct);  // UPDATE

// Delete entity
repo.Remove(user);
await unitOfWork.SaveChangesAsync(ct);  // DELETE
```

### Advanced Operations

```csharp
// Refresh entity from DB (discard changes)
user.Email = "temporary@gmail.com";
await repo.ReloadAsync(user, ct);  // user.Email back to DB value

// Raw LINQ for complex queries
var result = await repo.Query()
    .Where(u => u.CreatedAt > DateTime.UtcNow.AddMonths(-1))
    .Where(u => u.IsActive)
    .OrderByDescending(u => u.CreatedAt)
    .Select(u => new { u.Id, u.Email })
    .Take(10)
    .ToListAsync(ct);

// Bypass global filters (e.g., soft-delete)
var allUsers = await repo.QueryIgnoreFilters()
    .ToListAsync(ct);
```

---

## Part 6: EfRepository + DbContext Connection Map

```
┌─────────────────────────────────────────────────────┐
│ Your Service                                         │
│                                                      │
│ public class EventService {                         │
│     private readonly IRepository<Event> _repo;      │
│     public EventService(IRepository<Event> repo) {  │
│         _repo = repo;  // ← IRepository<Event>      │
│     }                                                │
│ }                                                    │
└──────────────────┬──────────────────────────────────┘
                   │ DI resolves to ↓
┌──────────────────────────────────────────────────────┐
│ EfRepository<Event>                                  │
│                                                      │
│ public class EfRepository<T> : IRepository<T> {     │
│     protected readonly AppDbContext Db;             │
│     protected readonly DbSet<T> DbSet;              │
│                                                      │
│     public EfRepository(AppDbContext db) {          │
│         Db = db;                 // ← DbContext     │
│         DbSet = db.Set<T>();    // ← DbSet<Event> │
│     }                                                │
│                                                      │
│     public async Task<Event?> GetByIdAsync(...) {   │
│         return await DbSet.FindAsync(...);          │
│         //                ↓                          │
│         //         Queries through Db.Set<Event>() │
│     }                                                │
│ }                                                    │
└──────────────────┬──────────────────────────────────┘
                   │ DbSet wraps ↓
┌──────────────────────────────────────────────────────┐
│ AppDbContext                                         │
│                                                      │
│ public class AppDbContext : DbContext {             │
│     public DbSet<Event> Events => Set<Event>();    │
│     public DbSet<User> Users => Set<User>();       │
│     // ... more DbSets                              │
│ }                                                    │
│                                                      │
│ public DbSet<T> Set<T>() where T : class {         │
│     // Returns DbSet<T> for the table               │
│ }                                                    │
└──────────────────┬──────────────────────────────────┘
                   │ DbSet communicates with ↓
┌──────────────────────────────────────────────────────┐
│ MySQL Database                                       │
│                                                      │
│ SELECT * FROM Events WHERE Id = @id                 │
│ SELECT * FROM Users WHERE Email = @email            │
│ INSERT INTO Orders ...                               │
│ UPDATE Events SET ...                                │
│ DELETE FROM Users ...                                │
└──────────────────────────────────────────────────────┘
```

---

## Summary: EfRepository in One Table

| Aspect | Details |
|--------|---------|
| **What is IRepository<T>?** | Generic interface defining standard data access operations for ANY entity |
| **What is EfRepository<T>?** | Generic implementation of IRepository<T> using Entity Framework Core |
| **How does it connect?** | Service → IRepository<T> → EfRepository<T> → AppDbContext → DbSet<T> → Database |
| **Generic?** | Yes - `IRepository<User>`, `IRepository<Event>`, etc. all use same code |
| **Specialized?** | Optional - extend for custom queries: `UserRepository : EfRepository<User>` |
| **Modify immediately?** | No - Add/Update/Remove only mark changes; SaveChangesAsync persists |
| **What about advanced queries?** | Use `Query()` or `QueryIgnoreFilters()` for complex LINQ |
| **Where are methods?** | All defined in `EfRepository<T>` class or interface `IRepository<T>` |
| **DI Registration?** | Generic: `AddScoped(typeof(IRepository<>), typeof(EfRepository<>))` |

---

## Quick Reference: Common Patterns

### Pattern 1: Simple Query and Modify

```csharp
// Get entity
var user = await repo.GetByIdAsync("user-123", ct);

// Modify in memory
user.LastLoginAt = DateTime.UtcNow;

// Save to DB
repo.Update(user);
await unitOfWork.SaveChangesAsync(ct);
```

### Pattern 2: Query with Filter

```csharp
// Get all matching a condition
var activeOrders = await repo.ListAsync(
    o => o.Status == "Active" && o.CreatedAt > DateTime.UtcNow.AddDays(-30),
    ct
);

// Use the results
foreach (var order in activeOrders)
{
    // Process each order
}
```

### Pattern 3: Complex LINQ Query

```csharp
// Advanced query not covered by basic methods
var result = await repo.Query()
    .Where(o => o.Status == "Pending")
    .Include(o => o.Items)
    .ThenInclude(i => i.Product)
    .OrderByDescending(o => o.CreatedAt)
    .Select(o => new OrderDto {
        Id = o.Id,
        Total = o.Items.Sum(i => i.Price * i.Quantity)
    })
    .ToListAsync(ct);
```

### Pattern 4: Bulk Update

```csharp
// In specialized repository
await DbSet.Where(u => u.FailedLoginCount >= 5)
    .ExecuteUpdateAsync(s => s
        .SetProperty(u => u.LockedUntil, DateTime.UtcNow.AddHours(1)),
    ct);
// Direct SQL UPDATE (much faster than loading each entity)
```

---

## When to Use Generic vs Specialized

| Scenario | Use |
|----------|-----|
| Entity has no custom queries (Event, Ticket, Product) | `IRepository<T>` generic |
| Entity has domain-specific queries (User - by email, by phone) | Specialized `IXxxRepository : IRepository<T>` |
| Query is complex and one-time | Use `Query()` method in service |
| Query is used in multiple services | Add method to specialized repository |

**Rule:** Generic for simple, specialized for domain-heavy entities.
