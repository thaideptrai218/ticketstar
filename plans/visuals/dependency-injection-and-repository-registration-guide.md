# Dependency Injection & Repository Registration in TicketStar

## The AddRepositories() Extension Method

**Location:** `API/Extensions/ServiceCollectionExtensions.cs` (lines 35-46)

```csharp
public static IServiceCollection AddRepositories(this IServiceCollection services)
{
    services.AddScoped<IUnitOfWork, EfUnitOfWork>();
    services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
    services.AddScoped<IUserRepository, UserRepository>();
    services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
    services.AddScoped<IMagicLinkRepository, MagicLinkRepository>();
    services.AddScoped<IAuthIdentityRepository, AuthIdentityRepository>();
    services.AddScoped<ISecurityEventRepository, SecurityEventRepository>();

    return services;
}
```

This method registers repositories in 2 different ways:

---

## 1️⃣ Generic Registration (Line 38)

```csharp
services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
```

### What This Does

This registers a **generic** interface-to-implementation mapping that works for **ANY entity type**:

```
IRepository<User>     → EfRepository<User>
IRepository<Event>    → EfRepository<Event>
IRepository<Order>    → EfRepository<Order>
IRepository<Ticket>   → EfRepository<Ticket>
... (any entity)
```

### How It Works

The `typeof(IRepository<>)` and `typeof(EfRepository<>)` are **open generic types**:
- `IRepository<>` = interface with empty generic slot (not `IRepository<User>` but the template)
- `EfRepository<>` = implementation with empty generic slot

When DI needs to resolve `IRepository<T>` for some type `T`, it:
1. Sees there's a registration for `IRepository<>`
2. Takes the concrete type `EfRepository<>`
3. Substitutes `T` in both: `IRepository<T>` → `EfRepository<T>`
4. Creates an instance of `EfRepository<T>`

### Example

```csharp
public class EventService
{
    private readonly IRepository<Event> _repo;

    public EventService(IRepository<Event> repo)
    {
        // DI says: "You need IRepository<Event>"
        // I have: IRepository<> → EfRepository<>
        // So I'll create: new EfRepository<Event>(dbContext)
        _repo = repo;
    }
}
```

### The Rule: Generic Registration

**Rule:** If you want a **basic, generic repository** for an entity:
- ✅ Use `IRepository<T>` interface
- ✅ The generic registration will provide `EfRepository<T>` automatically
- ❌ Don't create a specialized repository interface
- ❌ Don't manually register each entity type

**Example of entities that use generic repo:**
```csharp
// Event, Ticket, Order, OrderItem, Payment, CheckIn, StaffAssignment...
// All use IRepository<T> without custom interfaces
```

---

## 2️⃣ Specialized Repositories (Lines 39-43)

```csharp
services.AddScoped<IUserRepository, UserRepository>();
services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
services.AddScoped<IMagicLinkRepository, MagicLinkRepository>();
services.AddScoped<IAuthIdentityRepository, AuthIdentityRepository>();
services.AddScoped<ISecurityEventRepository, SecurityEventRepository>();
```

### What This Does

Each line registers a **specialized repository** that extends the generic one with custom domain-specific queries.

### Why Specialize?

Some entities need **extra domain-specific queries** that the generic `IRepository<T>` doesn't provide:

```csharp
// Generic repo provides:
//   - GetByIdAsync(id)
//   - ListAsync(predicate)
//   - Add(entity), Update(entity), Remove(entity)

// But UserRepository adds:
//   - GetByEmailAsync(email)              // Users are found by email
//   - EmailExistsAsync(email)              // Check email uniqueness
//   - IncrementFailedLoginAsync(userId)   // Security: track login attempts
//   - LockAccountAsync(userId, until)     // Security: lock account
```

### The Rule: When to Specialize

**Create a specialized repository when:**
1. ✅ Entity has domain-specific queries (by email, by code, etc.)
2. ✅ Need atomic/optimized operations (ExecuteUpdateAsync)
3. ✅ Multiple repositories use the same custom logic

**Example - UserRepository:**

```csharp
public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct);
    Task IncrementFailedLoginAsync(string userId, CancellationToken ct);
    Task LockAccountAsync(string userId, DateTime until, CancellationToken ct);
}

public class UserRepository : EfRepository<User>, IUserRepository
{
    // Inherits all generic IRepository<User> methods
    // Adds domain-specific methods above
}
```

### Registration Pattern

```csharp
// Step 1: Interface extends IRepository<T>
public interface IUserRepository : IRepository<User> { ... }

// Step 2: Implementation extends EfRepository<T>
public class UserRepository : EfRepository<User>, IUserRepository { ... }

// Step 3: Register in AddRepositories()
services.AddScoped<IUserRepository, UserRepository>();
```

---

## How DI Resolves Repositories

### Scenario 1: Generic Repository (no custom interface)

```csharp
public class EventService
{
    public EventService(IRepository<Event> repo)
    {
        // DI searches: is there a registration for IRepository<Event>?
        // Found: IRepository<> → EfRepository<>
        // Resolves: new EfRepository<Event>(dbContext)
    }
}
```

### Scenario 2: Specialized Repository (custom interface)

```csharp
public class AuthService
{
    public AuthService(IUserRepository userRepo)
    {
        // DI searches: is there a registration for IUserRepository?
        // Found: IUserRepository → UserRepository
        // Resolves: new UserRepository(dbContext)
        // (which extends EfRepository<User> so has all generic methods too)
    }
}
```

---

## Complete DI Resolution Flow

```
┌────────────────────────────────────────────────────────────────┐
│ Program.cs: builder.Services.AddRepositories()                 │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Step 1: Register generic repo (works for all entities)          │
│   services.AddScoped(typeof(IRepository<>),                     │
│                      typeof(EfRepository<>))                    │
│                                                                  │
│   Result:                                                        │
│   ┌─────────────────────────────────────────────────┐           │
│   │ IRepository<T> → EfRepository<T> (for any T)    │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                  │
│ Step 2: Register specialized repos (override generic for some)  │
│   services.AddScoped<IUserRepository,                           │
│                     UserRepository>();                         │
│   services.AddScoped<IRefreshTokenRepository,                   │
│                     RefreshTokenRepository>();                 │
│   ... (others)                                                   │
│                                                                  │
│   Result:                                                        │
│   ┌─────────────────────────────────────────────────┐           │
│   │ IUserRepository → UserRepository (specific)      │           │
│   │ IRepository<User> → UserRepository (via inherit) │           │
│   │ (because UserRepository implements both)         │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│ HTTP Request: Controller needs repositories                     │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│ EventController needs IRepository<Event>                        │
│   ↓ DI searches registrations...                               │
│   Found: IRepository<> → EfRepository<>                        │
│   ↓ Creates: new EfRepository<Event>(dbContext)                │
│                                                                  │
│ AuthController needs IUserRepository                            │
│   ↓ DI searches registrations...                               │
│   Found: IUserRepository → UserRepository                       │
│   ↓ Creates: new UserRepository(dbContext)                     │
│                                                                  │
│ TokenService needs IRepository<RefreshToken>                    │
│   ↓ DI searches registrations...                               │
│   Found: IRepository<> → EfRepository<>                        │
│   ↓ Creates: new EfRepository<RefreshToken>(dbContext)         │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Rules for Adding New Repositories

### Rule 1: Simple Entity (No Custom Queries)

**Entity:** Event, Ticket, Order, Payment, etc.

```csharp
// Option A: Use only generic IRepository<T>
public class EventService : IEventService
{
    private readonly IRepository<Event> _repo;

    public EventService(IRepository<Event> repo)
    {
        _repo = repo;
    }

    public async Task<Event?> GetEventAsync(string id)
        => await _repo.GetByIdAsync(id);
}

// No registration needed! Generic registration handles it.
```

### Rule 2: Entity with Custom Queries

**Entity:** User (needs GetByEmail, EmailExists, IncrementFailedLogin)

```csharp
// Step 1: Create specialized interface
public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct);
    Task IncrementFailedLoginAsync(string userId, CancellationToken ct);
    Task LockAccountAsync(string userId, DateTime until, CancellationToken ct);
}

// Step 2: Create implementation
public class UserRepository : EfRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext db) : base(db) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct)
        => await DbSet.FirstOrDefaultAsync(u => u.Email == email, ct);

    // ... other custom methods
}

// Step 3: Register in AddRepositories()
public static IServiceCollection AddRepositories(this IServiceCollection services)
{
    services.AddScoped<IUnitOfWork, EfUnitOfWork>();
    services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

    // Add your new repository here:
    services.AddScoped<IUserRepository, UserRepository>();  // ← New line

    return services;
}

// Step 4: Inject in services
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;  // ← Inject specialized repo

    public AuthService(IUserRepository userRepo)
    {
        _userRepo = userRepo;
    }
}
```

---

## Why This Pattern?

### Benefit 1: Zero Manual Work for Simple Entities

```csharp
// No registration needed - automatic!
public class EventService
{
    public EventService(IRepository<Event> repo) { }  // Just works
}
```

### Benefit 2: Clean Separation of Concerns

```csharp
// Generic interface: basic operations
IRepository<Event> generic = ...
generic.GetByIdAsync(id);
generic.ListAsync(e => e.IsActive);
generic.Add(newEvent);

// Specialized interface: domain-specific operations
IUserRepository specialized = ...
specialized.GetByEmailAsync(email);      // Only on IUserRepository
specialized.EmailExistsAsync(email);     // Only on IUserRepository
specialized.IncrementFailedLoginAsync(id);  // Only on IUserRepository
```

### Benefit 3: Consistent Implementation

All repositories inherit from `EfRepository<T>`, so:
- Same LINQ patterns
- Same error handling
- Same transaction support
- Same entity state management

---

## Summary Table

| Scenario | Pattern | Registration |
|----------|---------|--------------|
| **Simple entity** (Event, Ticket, Order) | Use `IRepository<T>` | ✅ Automatic via generic |
| **Entity with custom queries** (User, RefreshToken) | Create `IXxxRepository : IRepository<T>` | ✅ Manual in AddRepositories() |
| **All repositories** | Inherit from `EfRepository<T>` | ✅ Automatic, no extra work |
| **Add new entity** | Add to `AppDbContext.DbSet<T>` | ✅ No DI changes needed |
| **Add custom queries** | Create specialized repo + interface | ✅ One line in AddRepositories() |

---

## Key Insight

**The magic is in line 38:**
```csharp
services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
```

This single line makes **ANY** entity automatically injectable:
- No reflection scanning needed
- No naming conventions required
- Just inject `IRepository<YourEntity>` and it works
- For custom queries, add a specialized interface alongside

**This is "smart" because it does the right amount—zero magic, explicit registration where needed.**
