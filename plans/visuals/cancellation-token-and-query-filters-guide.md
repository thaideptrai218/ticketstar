# CancellationToken & QueryIgnoreFilters - Complete Guide

## Part 1: CancellationToken (ct = default)

### What is CancellationToken?

A **CancellationToken** is a signal that says "stop what you're doing" before the operation completes.

**Real-world analogy:**
```
You're ordering food at a restaurant:
1. You place order (async operation starts)
2. Chef is cooking (operation in progress)
3. You change your mind and cancel order (CancellationToken triggered)
4. Chef stops cooking (operation cancels gracefully)
```

In code:
```csharp
// Scenario: User closes browser tab while data is loading

// Browser sends cancellation
var cts = new CancellationTokenSource();
var loadingTask = _repo.ListAsync(predicate, cts.Token);

// User closes tab
cts.Cancel();  // ← Cancellation signal sent

// Database query stops gracefully
// No wasted resources processing data no one will use
```

---

### The Signature: `CancellationToken ct = default`

Let's break down what each part means:

```csharp
public async Task<List<User>> ListAsync(
    Expression<Func<User, bool>>? predicate = null,
    CancellationToken ct = default  // ← What's this?
)
```

| Part | Meaning |
|------|---------|
| `CancellationToken` | Type - a token that can signal cancellation |
| `ct` | Parameter name (common convention) |
| `= default` | Default value: `CancellationToken.None` (never cancels) |

**What `= default` means:**
```csharp
// These three are equivalent:

// Explicit
await repo.ListAsync(predicate, CancellationToken.None);

// Using default
await repo.ListAsync(predicate, default);

// Omitting parameter (uses default)
await repo.ListAsync(predicate);  // ← ct automatically = default
```

So `= default` makes the parameter **optional**.

---

### Why Every Async Method Has It

**Reason 1: User Cancellation (Timeouts, Close Tab, etc.)**

Imagine a slow database query:

```csharp
// Without CancellationToken:
public async Task<List<Event>> GetEventsAsync()
{
    // User closes browser tab
    // Query STILL runs for 30 seconds
    // Database connection stays open
    // Server resources wasted
    return await _db.Events.ToListAsync();  // ❌ Can't cancel!
}

// With CancellationToken:
public async Task<List<Event>> GetEventsAsync(CancellationToken ct = default)
{
    // User closes browser tab
    // Cancellation token triggered
    // Query stops immediately
    return await _db.Events.ToListAsync(ct);  // ✅ Can cancel!
}
```

**Reason 2: Graceful Shutdown**

```csharp
// Server is shutting down
// Don't want to kill active requests abruptly
// Want them to finish gracefully

public async Task<User> GetUserAsync(string id, CancellationToken ct = default)
{
    return await _db.Users.FindAsync(new object[] { id }, cancellationToken: ct);
    // When server shuts down:
    // - Active requests receive cancellation token
    // - They complete gracefully instead of being killed
}
```

**Reason 3: Timeout Management**

```csharp
// ASP.NET automatically passes cancellation token
// If request takes too long, token is cancelled

[HttpGet("events")]
public async Task<IActionResult> GetEvents(CancellationToken ct)
{
    // ct is automatically provided by ASP.NET Core
    // If client disconnects or timeout occurs, ct.IsCancellationRequested = true
    var events = await _repo.ListAsync(ct: ct);
    return Ok(events);
}
```

---

### How CancellationToken Works in Practice

**Step 1: Create a cancellation source**

```csharp
var cts = new CancellationTokenSource();
var token = cts.Token;  // Get the token to pass to async methods
```

**Step 2: Pass token to async operations**

```csharp
var task = _repo.ListAsync(predicate: null, ct: token);
//                                           ↑ Pass token here
```

**Step 3: Cancel when needed**

```csharp
// After 5 seconds, cancel
cts.CancelAfter(TimeSpan.FromSeconds(5));

// Or cancel immediately
cts.Cancel();
```

**Step 4: Handle cancellation**

```csharp
try
{
    var users = await _repo.ListAsync(ct: token);
}
catch (OperationCanceledException)
{
    // Token was cancelled - operation stopped gracefully
    Console.WriteLine("Operation was cancelled");
}
```

---

### Real-World Example: ASP.NET Core Controller

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _repo;

    public UsersController(IUserRepository repo)
    {
        _repo = repo;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(
        string id,
        CancellationToken ct  // ← ASP.NET provides this automatically
    )
    {
        // If client closes browser, disconnects, or timeout happens:
        // ct.IsCancellationRequested becomes true

        var user = await _repo.GetByIdAsync(id, ct);
        //                                     ↑ Pass to repository

        if (user == null)
            return NotFound();

        return Ok(user);
    }

    [HttpGet]
    public async Task<ActionResult<List<User>>> GetAllUsers(CancellationToken ct)
    {
        // Cancellation token automatically passed by ASP.NET
        var users = await _repo.ListAsync(predicate: null, ct: ct);
        return Ok(users);
    }
}

// What happens:
// 1. Client makes GET /api/users
// 2. ASP.NET creates CancellationToken for this request
// 3. Passes it to your action method: GetAllUsers(CancellationToken ct)
// 4. You pass it to repository: ListAsync(ct: ct)
// 5. If client closes browser → ct is cancelled
// 6. Database query stops → resources freed
```

---

### Common Patterns

**Pattern 1: Timeout with CancellationToken**

```csharp
public async Task<User?> GetUserWithTimeoutAsync(string id)
{
    var cts = new CancellationTokenSource();
    cts.CancelAfter(TimeSpan.FromSeconds(5));  // 5-second timeout

    try
    {
        return await _repo.GetByIdAsync(id, ct: cts.Token);
    }
    catch (OperationCanceledException)
    {
        // Timeout occurred
        return null;
    }
}
```

**Pattern 2: Cancel long operation**

```csharp
public async Task ProcessLargeDatasetAsync()
{
    var cts = new CancellationTokenSource();

    // Start processing
    var processingTask = ProcessAsync(cts.Token);

    // User cancels after 10 seconds
    await Task.Delay(10000);
    cts.Cancel();  // Stop processing

    try
    {
        await processingTask;
    }
    catch (OperationCanceledException)
    {
        Console.WriteLine("Processing cancelled by user");
    }
}

private async Task ProcessAsync(CancellationToken ct)
{
    while (!ct.IsCancellationRequested)
    {
        // Do work
        await Task.Delay(100);
    }
}
```

**Pattern 3: ASP.NET automatically provides it**

```csharp
[HttpPost("create")]
public async Task<IActionResult> CreateUser(
    [FromBody] CreateUserRequest req,
    CancellationToken ct  // ← Automatically provided!
)
{
    // No need to create CancellationTokenSource yourself
    // ASP.NET gives you one that respects client disconnection
    var user = User.Create(req.Email);
    _repo.Add(user);
    await _unitOfWork.SaveChangesAsync(ct);  // ← Pass to your operations
    return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
}
```

---

## Part 2: QueryIgnoreFilters

### What are Global Query Filters?

A **global query filter** is a rule automatically applied to **every** query on an entity.

**Example in TicketStar:**

```csharp
// In AppDbContext.OnModelCreating:
builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);
```

This means:
- Every query on Users automatically filters out soft-deleted users
- You don't have to manually add `WHERE DeletedAt IS NULL` every time

---

### How It Works

**Without filter:**
```csharp
// Direct query
var allUsers = await _db.Users.ToListAsync();
// SELECT * FROM Users

// Gets both active AND deleted users
```

**With global query filter:**
```csharp
// Same query
var activeUsers = await _repo.ListAsync();
// But behind the scenes, EF automatically adds filter:
// SELECT * FROM Users WHERE DeletedAt IS NULL

// Gets ONLY active users (deleted ones are hidden)
```

---

### Why Use Global Query Filters?

**Reason 1: Soft Deletes (Don't Actually Delete)**

```csharp
// Traditional delete: permanently remove
DELETE FROM Users WHERE Id = @id;

// Soft delete: mark as deleted, keep data
UPDATE Users SET DeletedAt = GETDATE() WHERE Id = @id;
```

**Benefits of soft delete:**
- Can recover deleted data
- Maintain referential integrity
- Audit trail
- But need to hide deleted records by default

**Problem:** Every query needs `WHERE DeletedAt IS NULL`

**Solution:** Global query filter applies automatically

```csharp
// Configuration (one time)
builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);

// Now every query automatically filters:
var users = await repo.ListAsync();  // Automatically soft-deleted excluded
```

**Reason 2: Multi-Tenancy (Data Isolation)**

```csharp
// If you had multi-tenant app:
builder.Entity<Order>().HasQueryFilter(o => o.TenantId == currentTenantId);

// Every query automatically filtered to current tenant
```

---

### QueryIgnoreFilters: Bypass the Filter

Sometimes you **need to see filtered-out data**:

```csharp
// Scenario 1: Admin needs to see deleted users
var deletedUsers = await repo.QueryIgnoreFilters()
    .Where(u => u.DeletedAt != null)
    .ToListAsync();

// Scenario 2: Restore deleted user (need to find it first!)
var deletedUser = await repo.QueryIgnoreFilters()
    .FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt != null);

deletedUser.DeletedAt = null;  // Restore
await repo.Update(deletedUser);
await unitOfWork.SaveChangesAsync();

// Scenario 3: Audit log (see all records including deleted)
var allUserHistory = await repo.QueryIgnoreFilters()
    .OrderByDescending(u => u.CreatedAt)
    .ToListAsync();
```

---

### Comparison: With vs Without Filter

```csharp
public class UserRepository : EfRepository<User>, IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct)
    {
        // WITH filter - normal case
        return await DbSet.FirstOrDefaultAsync(u => u.Email == email, ct);
        // WHERE Email = @email AND DeletedAt IS NULL
        // Hidden query: auto-applied global filter
    }

    public async Task<User?> GetByEmailIgnoreFiltersAsync(string email, CancellationToken ct)
    {
        // WITHOUT filter - special case
        return await DbSet.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == email, ct);
        // WHERE Email = @email
        // (no DeletedAt check)
    }

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct)
    {
        // Check if email exists (including soft-deleted accounts)
        return await DbSet.IgnoreQueryFilters()
            .AnyAsync(u => u.Email == email, ct);
    }
}
```

---

### Real-World Example: User Soft Delete

```csharp
public class UserService : IUserService
{
    private readonly IUserRepository _repo;
    private readonly IUnitOfWork _unitOfWork;

    public UserService(IUserRepository repo, IUnitOfWork unitOfWork)
    {
        _repo = repo;
        _unitOfWork = unitOfWork;
    }

    // ✅ Get active user (uses global filter)
    public async Task<User?> GetActiveUserAsync(string id, CancellationToken ct)
    {
        return await _repo.GetByIdAsync(id, ct);
        // SELECT * FROM Users WHERE Id = @id AND DeletedAt IS NULL
        // Deleted users are hidden automatically
    }

    // ✅ Delete user (soft delete)
    public async Task DeleteUserAsync(string id, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(id, ct);
        if (user == null)
            return;

        user.DeletedAt = DateTime.UtcNow;  // Mark as deleted
        _repo.Update(user);
        await _unitOfWork.SaveChangesAsync(ct);
        // UPDATE Users SET DeletedAt = GETDATE() WHERE Id = @id
    }

    // ✅ Restore user (need to bypass filter to find it)
    public async Task RestoreUserAsync(string id, CancellationToken ct)
    {
        // MUST use QueryIgnoreFilters to find deleted user
        var deletedUser = await _repo.QueryIgnoreFilters()
            .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt != null, ct);

        if (deletedUser == null)
            return;

        deletedUser.DeletedAt = null;  // Unmark as deleted
        _repo.Update(deletedUser);
        await _unitOfWork.SaveChangesAsync(ct);
        // UPDATE Users SET DeletedAt = NULL WHERE Id = @id
    }

    // ✅ Admin: View all users (including deleted)
    public async Task<List<User>> GetAllUsersForAdminAsync(CancellationToken ct)
    {
        return await _repo.QueryIgnoreFilters()
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(ct);
        // SELECT * FROM Users (no filter applied)
    }

    // ✅ Check if email exists (even deleted accounts)
    public async Task<bool> IsEmailTakenAsync(string email, CancellationToken ct)
    {
        return await _repo.EmailExistsAsync(email, ct);
        // Inside EmailExistsAsync, uses QueryIgnoreFilters
        // Because: can't register with email of deleted account
    }
}
```

---

### How Global Filter is Configured

```csharp
// In AppDbContext.cs
protected override void OnModelCreating(ModelBuilder builder)
{
    base.OnModelCreating(builder);

    // Apply all configurations from assembly
    builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

    // Soft-delete global filter
    builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);
    //                                        ↑ Applied to EVERY User query
}
```

**This single line means:**
- Every `_db.Users.Where(...)` query automatically adds `AND DeletedAt IS NULL`
- No need to repeat the filter in every query
- One place to manage the rule

---

## Part 3: CancellationToken + QueryIgnoreFilters Together

### Common Pattern: Admin View

```csharp
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IUserRepository _userRepo;

    [HttpGet("users/all")]
    public async Task<ActionResult<List<User>>> GetAllUsers(CancellationToken ct)
    {
        // Admin needs to see all users (including deleted)
        // Use QueryIgnoreFilters to bypass soft-delete filter
        // Use ct for cancellation support
        var allUsers = await _userRepo.QueryIgnoreFilters()
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(ct);
            //             ↑ CancellationToken

        return Ok(allUsers);
    }

    [HttpPost("users/{id}/restore")]
    public async Task<IActionResult> RestoreUser(string id, CancellationToken ct)
    {
        // Find deleted user (need QueryIgnoreFilters)
        var user = await _userRepo.QueryIgnoreFilters()
            .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt != null, ct);
            //                                                              ↑ CancellationToken

        if (user == null)
            return NotFound();

        user.DeletedAt = null;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(ct);
            //                              ↑ CancellationToken

        return Ok(user);
    }
}
```

---

## Summary: CancellationToken vs QueryIgnoreFilters

| Aspect | CancellationToken | QueryIgnoreFilters |
|--------|-------------------|-------------------|
| **Purpose** | Stop operation gracefully | Bypass global filters |
| **When Used** | Every async method | Only when you need filtered data |
| **Parameter** | `CancellationToken ct = default` | `.QueryIgnoreFilters()` |
| **Example** | `GetByIdAsync(id, ct)` | `QueryIgnoreFilters().Where(...)` |
| **Default behavior** | Optional, none if omitted | Filters applied automatically |
| **Use case** | Timeouts, client disconnect | Soft deletes, admin views |
| **Propagate** | Pass to every async call | Use where needed |

---

## Quick Reference

### CancellationToken Checklist

```csharp
// ✅ Always add to async methods
public async Task<User> GetUserAsync(string id, CancellationToken ct = default)

// ✅ Pass to async calls
var user = await _repo.GetByIdAsync(id, ct);
var users = await _db.Users.ToListAsync(ct);

// ✅ In controllers, use ASP.NET's provided token
public async Task<IActionResult> GetUser(string id, CancellationToken ct)

// ✅ In services, accept and pass through
public async Task ProcessAsync(CancellationToken ct)
{
    await _repo.ListAsync(ct: ct);
}
```

### QueryIgnoreFilters Checklist

```csharp
// ❌ Normal query (filters applied)
var users = await _repo.ListAsync();  // Only active

// ✅ Bypass filter (get all data)
var allUsers = await _repo.QueryIgnoreFilters()
    .ToListAsync();  // Active + Deleted

// ✅ When checking soft-deleted records
var deleted = await _repo.QueryIgnoreFilters()
    .Where(u => u.DeletedAt != null)
    .ToListAsync();

// ✅ When restoring/recovering data
var user = await _repo.QueryIgnoreFilters()
    .FirstOrDefaultAsync(u => u.Id == id && u.DeletedAt != null);
```

---

## Why TicketStar Uses Both

**CancellationToken:**
- Makes the API responsive
- Respects user cancellations (close tab, timeout)
- Proper async/await pattern

**QueryIgnoreFilters:**
- Soft deletes hide data by default
- Can recover when needed
- Admin features work properly
- One rule (no repetition)

**Together:**
```csharp
// Graceful cancellation + secure data access
var allUsers = await _userRepo.QueryIgnoreFilters()
    .ToListAsync(ct);
```
