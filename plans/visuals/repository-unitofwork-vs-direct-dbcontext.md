# Why Repository + UnitOfWork is Better Than Direct DbContext

## The Problem: Direct DbContext Access

### ❌ BAD: Calling AppDbContext Directly Everywhere

Imagine every service directly uses `AppDbContext.Users`:

```csharp
public class AuthService
{
    private readonly AppDbContext _db;

    public AuthService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> LoginAsync(string email, string password)
    {
        // Directly query Users table
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null) return false;

        // Directly query AuthSessions table
        var session = await _db.AuthSessions
            .Where(s => s.UserId == user.Id && s.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync();

        if (session == null)
        {
            // Directly add new session
            var newSession = AuthSession.Create(user.Id, "Mozilla/5.0...");
            _db.AuthSessions.Add(newSession);
        }

        // Directly save changes
        await _db.SaveChangesAsync();
        return true;
    }
}

public class EventService
{
    private readonly AppDbContext _db;

    public EventService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<Event>> GetActiveEventsAsync()
    {
        // Each service repeats the same queries...
        return await _db.Events
            .Where(e => e.IsActive)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
    }
}

public class OrderService
{
    private readonly AppDbContext _db;IAuthIdentityRepository

    public OrderService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Order> CreateOrderAsync(CreateOrderRequest req)
    {
        // Another service doing the same DbContext access pattern...
        var order = Order.Create(req.UserId, req.Items);
        _db.Orders.Add(order);

        foreach (var item in req.Items)
        {
            // Mixed concerns: fetch, modify, save
            var ticket = await _db.Tickets.FindAsync(item.TicketId);
            ticket.AvailableQuantity -= item.Quantity;
            _db.Tickets.Update(ticket);
        }

        await _db.SaveChangesAsync();
        return order;
    }
}
```

### Problems This Creates

```
┌─────────────────────────────────────────────────────────────┐
│ PROBLEM 1: Scattered Data Access Logic                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Query for "find user by email" exists in:                   │
│  ✗ AuthService                                              │
│  ✗ UserManagementService                                    │
│  ✗ AccountRecoveryService                                   │
│  ✗ NotificationService                                      │
│  ... (repeated 10 times!)                                    │
│                                                               │
│ If query logic changes, update 10 places!                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEM 2: Testing Nightmare                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ To unit test AuthService:                                   │
│  ✗ Need to mock entire AppDbContext                         │
│  ✗ AppDbContext is a complex object with 20+ DbSets         │
│  ✗ Mock every table method                                  │
│  ✗ Tests become brittle and hard to read                    │
│                                                               │
│ Mock setup:                                                  │
│  var dbMock = new Mock<AppDbContext>();                    │
│  var usersMock = new Mock<DbSet<User>>();                  │
│  dbMock.Setup(d => d.Users).Returns(usersMock.Object);     │
│  usersMock.Setup(u => u.FirstOrDefaultAsync(...))          │
│      .ReturnsAsync(new User { ... });                       │
│  usersMock.Setup(u => u.Where(...)).Returns(...);          │
│  ... (10 more lines of mocking!)                            │
│                                                               │
│ Tests are THICK and HARD TO READ                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEM 3: No Transaction Coordination                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Multiple services save independently:                        │
│                                                               │
│  async Task ComplexOperation()                              │
│  {                                                            │
│      await authService.CreateUserAsync(...);                │
│      // SaveChangesAsync() here                             │
│                                                               │
│      await billingService.CreatePaymentAsync(...);          │
│      // SaveChangesAsync() here                             │
│                                                               │
│      await notifyService.SendWelcomeEmailAsync(...);        │
│      // SaveChangesAsync() here                             │
│  }                                                            │
│                                                               │
│ If step 2 fails:                                             │
│  - User ALREADY created in DB (from step 1)                 │
│  - Payment FAILED                                            │
│  - Email not sent                                            │
│  → INCONSISTENT STATE!                                       │
│                                                               │
│ Need manual transaction management scattered in code         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEM 4: Tight Coupling to EF Core                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Every service imports:                                       │
│  using Microsoft.EntityFrameworkCore;                       │
│  using TicketStar.Infrastructure.Data;                      │
│                                                               │
│ If you want to:                                              │
│  ✗ Switch ORM (EF → Dapper → raw SQL)                       │
│  ✗ Use caching layer                                        │
│  ✗ Add logging/tracing                                      │
│  ✗ Use different DB per environment                         │
│                                                               │
│ Must change EVERY SERVICE!                                   │
│ (Business layer shouldn't know about DbContext)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEM 5: No Consistency Rules                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Service A:                                                    │
│  var user = _db.Users.First(u => u.Id == id);              │
│  user.LastLoginAt = DateTime.UtcNow;                        │
│  _db.SaveChangesAsync();                                     │
│                                                               │
│ Service B:                                                    │
│  var user = _db.Users.FirstOrDefault(u => u.Id == id);     │
│  if (user != null) _db.SaveChangesAsync();                   │
│                                                               │
│ Service C:                                                    │
│  _db.Users.Where(u => u.Id == id)                           │
│      .ExecuteUpdate(...);                                    │
│                                                               │
│ Same operation, 3 different patterns!                        │
│ Inconsistent, hard to maintain, prone to bugs                │
└─────────────────────────────────────────────────────────────┘
```

---

## The Solution: Repository + UnitOfWork Pattern

### ✅ GOOD: Using Repository + UnitOfWork

```csharp
// Same logic, but CLEAN separation of concerns

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly ISessionRepository _sessionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository userRepository,
        ISessionRepository sessionRepository,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _sessionRepository = sessionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> LoginAsync(string email, string password, CancellationToken ct)
    {
        // Transaction: ALL-OR-NOTHING
        await _unitOfWork.BeginTransactionAsync(ct);

        try
        {
            // Query through repository (abstracted)
            var user = await _userRepository.GetByEmailAsync(email, ct);
            if (user == null) return false;

            // Query through repository (abstracted)
            var session = await _sessionRepository.GetValidSessionAsync(user.Id, ct);

            if (session == null)
            {
                // Create through repository (abstracted)
                var newSession = AuthSession.Create(user.Id, "Mozilla/5.0...");
                _sessionRepository.Add(newSession);
            }

            // Save everything atomically
            await _unitOfWork.SaveChangesAsync(ct);
            await _unitOfWork.CommitTransactionAsync(ct);
            return true;
        }
        catch
        {
            // Automatic rollback if anything fails
            await _unitOfWork.RollbackTransactionAsync(ct);
            return false;
        }
    }
}
```

---

## Why Repository Pattern is Better

### 1️⃣ Single Source of Truth

```csharp
// Before: "get user by email" logic in 5 different services
// After: ONE place

public class UserRepository : EfRepository<User>, IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct)
        => await DbSet.FirstOrDefaultAsync(u => u.Email == email, ct);
}

// All services use it:
public class AuthService
{
    public AuthService(IUserRepository repo) { }

    public async Task LoginAsync(string email)
    {
        var user = await repo.GetByEmailAsync(email);  // ← Same logic
    }
}

public class UserManagementService
{
    public UserManagementService(IUserRepository repo) { }

    public async Task UpdateProfileAsync(string email)
    {
        var user = await repo.GetByEmailAsync(email);  // ← Same logic
    }
}
```

**Benefit:** Change logic once, everywhere benefits!

---

### 2️⃣ Easy Testing with Interfaces

```csharp
// Before: Mock AppDbContext (complex)
var dbMock = new Mock<AppDbContext>();
var usersMock = new Mock<DbSet<User>>();
dbMock.Setup(d => d.Users).Returns(usersMock.Object);
usersMock.Setup(u => u.FirstOrDefaultAsync(...)).ReturnsAsync(...);
// ... 10 more lines

// After: Mock repository (simple)
var userRepoMock = new Mock<IUserRepository>();
userRepoMock.Setup(r => r.GetByEmailAsync("test@gmail.com", It.IsAny<CancellationToken>()))
    .ReturnsAsync(new User { Email = "test@gmail.com" });

// Use in test:
var authService = new AuthService(userRepoMock.Object, sessionRepoMock.Object, unitOfWorkMock.Object);
var result = await authService.LoginAsync("test@gmail.com", "password", ct);

// Clean, readable, focused test!
```

**Benefit:** Tests are shorter, clearer, easier to maintain

---

### 3️⃣ Transaction Coordination (UnitOfWork)

```csharp
// Before: Each service saves independently
public async Task<Order> CreateOrderAsync(CreateOrderRequest req)
{
    var order = Order.Create(req.UserId);
    _db.Orders.Add(order);
    await _db.SaveChangesAsync();  // ← Saved!

    var payment = Payment.Create(order.Id);
    _db.Payments.Add(payment);
    await _db.SaveChangesAsync();  // ← If this fails, order already in DB!

    // Inconsistent state!
}

// After: UnitOfWork coordinates everything
public async Task<Order> CreateOrderAsync(CreateOrderRequest req)
{
    await _unitOfWork.BeginTransactionAsync(ct);
    try
    {
        var order = Order.Create(req.UserId);
        _orderRepository.Add(order);

        var payment = Payment.Create(order.Id);
        _paymentRepository.Add(payment);

        // Save everything
        await _unitOfWork.SaveChangesAsync(ct);

        // Commit everything
        await _unitOfWork.CommitTransactionAsync(ct);
        // Both saved or neither saved!
    }
    catch
    {
        await _unitOfWork.RollbackTransactionAsync(ct);
        throw;
    }
}
```

**Benefit:** Atomic operations—all-or-nothing guarantee!

---

### 4️⃣ Decoupling from EF Core

```csharp
// Before: Service knows about DbContext
public class UserService
{
    private readonly AppDbContext _db;  // ← Tight coupling to EF

    public async Task<User> GetUserAsync(string id)
    {
        return await _db.Users.FindAsync(id);
    }
}

// After: Service only knows about repository interface
public class UserService
{
    private readonly IUserRepository _repo;  // ← Only interface

    public async Task<User> GetUserAsync(string id)
    {
        return await _repo.GetByIdAsync(id);
    }
}

// If you want to swap implementation:

// Production: EF + MySQL
services.AddScoped<IUserRepository, EfUserRepository>();

// Testing: Mock
services.AddScoped<IUserRepository>(sp => userRepositoryMock.Object);

// Future: Dapper + PostgreSQL
services.AddScoped<IUserRepository, DapperUserRepository>();
// Service code doesn't change!
```

**Benefit:** Easy to swap implementations, test with mocks, migrate technologies

---

### 5️⃣ Consistency & Standards

```csharp
// All repositories follow same pattern:

public interface IRepository<T>
{
    Task<T?> GetByIdAsync(string id, CancellationToken ct);
    Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate, CancellationToken ct);
    void Add(T entity);
    void Update(T entity);
    void Remove(T entity);
}

// Every service uses consistent patterns:

public class EventService
{
    public async Task<Event?> GetEventAsync(string id, CancellationToken ct)
        => await _eventRepository.GetByIdAsync(id, ct);  // Same pattern

    public async Task<List<Event>> GetActiveEventsAsync(CancellationToken ct)
        => await _eventRepository.ListAsync(e => e.IsActive, ct);  // Same pattern
}

public class OrderService
{
    public async Task<Order?> GetOrderAsync(string id, CancellationToken ct)
        => await _orderRepository.GetByIdAsync(id, ct);  // Same pattern

    public async Task<List<Order>> GetPendingOrdersAsync(CancellationToken ct)
        => await _orderRepository.ListAsync(o => o.Status == "Pending", ct);  // Same pattern
}
```

**Benefit:** Predictable, consistent codebase—everyone knows where to look

---

## Side-by-Side Comparison

### ❌ Direct DbContext Access

```csharp
public class OrderService
{
    private readonly AppDbContext _db;

    public async Task CreateOrderAsync(CreateOrderRequest req)
    {
        var order = Order.Create(req.UserId);
        _db.Orders.Add(order);

        foreach (var item in req.Items)
        {
            var ticket = await _db.Tickets.FindAsync(item.TicketId);
            ticket.AvailableQuantity -= item.Quantity;
            _db.Tickets.Update(ticket);
        }

        await _db.SaveChangesAsync();

        // Where do I handle transactions?
        // What if ticket query fails?
        // All data access is mixed with business logic
    }
}

// Tests:
[Test]
public async Task CreateOrder_Should_UpdateTickets()
{
    var dbMock = new Mock<AppDbContext>();
    var ordersMock = new Mock<DbSet<Order>>();
    var ticketsMock = new Mock<DbSet<Ticket>>();

    dbMock.Setup(d => d.Orders).Returns(ordersMock.Object);
    dbMock.Setup(d => d.Tickets).Returns(ticketsMock.Object);
    ordersMock.Setup(o => o.Add(It.IsAny<Order>())).Callback<Order>(o => { });
    ticketsMock.Setup(t => t.FindAsync(It.IsAny<string>()))
        .ReturnsAsync(new Ticket { });
    ticketsMock.Setup(t => t.Update(It.IsAny<Ticket>())).Callback<Ticket>(t => { });
    dbMock.Setup(d => d.SaveChangesAsync(It.IsAny<CancellationToken>()))
        .ReturnsAsync(1);

    var service = new OrderService(dbMock.Object);
    await service.CreateOrderAsync(new CreateOrderRequest { ... });

    // 20+ lines of setup for a simple test!
}
```

### ✅ Repository + UnitOfWork

```csharp
public class OrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly ITicketRepository _ticketRepository;
    private readonly IUnitOfWork _unitOfWork;

    public async Task CreateOrderAsync(CreateOrderRequest req, CancellationToken ct)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        try
        {
            var order = Order.Create(req.UserId);
            _orderRepository.Add(order);

            foreach (var item in req.Items)
            {
                await _ticketRepository.DecrementAvailableAsync(
                    item.TicketId, item.Quantity, ct);
            }

            await _unitOfWork.SaveChangesAsync(ct);
            await _unitOfWork.CommitTransactionAsync(ct);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(ct);
            throw;
        }
    }
}

// Tests:
[Test]
public async Task CreateOrder_Should_UpdateTickets()
{
    var orderRepoMock = new Mock<IOrderRepository>();
    var ticketRepoMock = new Mock<ITicketRepository>();
    var unitOfWorkMock = new Mock<IUnitOfWork>();

    unitOfWorkMock.Setup(u => u.BeginTransactionAsync(It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);
    unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
        .ReturnsAsync(1);
    unitOfWorkMock.Setup(u => u.CommitTransactionAsync(It.IsAny<CancellationToken>()))
        .Returns(Task.CompletedTask);

    var service = new OrderService(orderRepoMock.Object, ticketRepoMock.Object, unitOfWorkMock.Object);
    await service.CreateOrderAsync(new CreateOrderRequest { ... }, ct);

    orderRepoMock.Verify(r => r.Add(It.IsAny<Order>()), Times.Once);
    ticketRepoMock.Verify(r => r.DecrementAvailableAsync(...), Times.Once);
    unitOfWorkMock.Verify(u => u.CommitTransactionAsync(...), Times.Once);

    // 15 lines, clear intent, tests one thing
}
```

---

## Summary: Why Repository + UnitOfWork Wins

| Aspect | Direct DbContext | Repository + UnitOfWork |
|--------|-----------------|------------------------|
| **Query reuse** | Scattered in 10 places | One interface, one impl |
| **Testing** | Mock complex DbContext | Mock simple interfaces |
| **Transactions** | Manual, scattered | Centralized, coordinated |
| **Coupling** | Tight to EF | Loose, swappable |
| **Consistency** | Ad-hoc patterns | Standard interface |
| **Maintainability** | Hard, many places to change | Easy, single place |
| **Business logic** | Mixed with data access | Separated, clean |
| **Code reuse** | No | Yes, through interfaces |

---

## Real-World Example: Why It Matters

### Scenario: "Make login more secure - track failed attempts"

**Direct DbContext Approach:**
```csharp
// Search codebase for "Users" access...
// Found in: AuthService, AccountService, UserManagementService, AdminService...

// Edit AuthService:
var user = _db.Users.First(u => u.Email == email);
user.FailedAttempts++;
if (user.FailedAttempts > 5)
    user.LockedUntil = DateTime.UtcNow.AddHours(1);
_db.SaveChangesAsync();

// Edit AccountService:
var user = _db.Users.FirstOrDefault(u => u.Email == email);
user.FailedAttempts++;
// ... different implementation!

// Edit UserManagementService:
var user = await _db.Users.FindAsync(email);
user.FailedAttempts = user.FailedAttempts + 1;
// ... yet another variation!

// ❌ 10 places to update, inconsistent implementations, bugs everywhere!
```

**Repository Approach:**
```csharp
// Edit ONE place: UserRepository

public class UserRepository : EfRepository<User>, IUserRepository
{
    public async Task IncrementFailedLoginAsync(string userId, CancellationToken ct)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.FailedLoginCount, u => u.FailedLoginCount + 1),
            ct);

    public async Task LockAccountAsync(string userId, DateTime until, CancellationToken ct)
        => await DbSet.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedUntil, until), ct);
}

// Every service automatically uses updated logic:
public class AuthService
{
    public async Task LoginAsync(string email, string password, CancellationToken ct)
    {
        var user = await _userRepository.GetByEmailAsync(email, ct);
        if (!_hasher.Verify(user.PasswordHash, password))
        {
            // Uses SAME implementation everywhere
            await _userRepository.IncrementFailedLoginAsync(user.Id, ct);

            var failedCount = user.FailedLoginCount;
            if (failedCount > 5)
                await _userRepository.LockAccountAsync(user.Id, DateTime.UtcNow.AddHours(1), ct);
        }
    }
}

// ✅ One place to change, all services benefit, consistent behavior!
```

---

## Conclusion

**Direct DbContext = Spaghetti Code**
- Data access scattered everywhere
- Hard to test
- No transaction coordination
- Tight coupling
- Inconsistent patterns

**Repository + UnitOfWork = Clean Architecture**
- Data access centralized
- Easy to test
- Transaction coordination
- Loose coupling
- Consistent patterns

**In TicketStar:** You're using the professional, scalable approach! 🎉
