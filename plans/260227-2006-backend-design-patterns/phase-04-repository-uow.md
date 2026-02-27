# Phase 4: Repository + Unit of Work

**Status:** Pending
**Blocked By:** None
**Effort:** Medium

---

## Overview

Abstract data access behind repository interfaces. Services depend on IRepository instead of AppDbContext directly. Generic base + entity-specific repositories.

## Architecture

```
Domain layer:     IRepository<T>, IUnitOfWork, IUserRepository (interfaces)
Infrastructure:   EfRepository<T>, EfUnitOfWork, UserRepository (implementations)
Application:      Services inject IUserRepository, IUnitOfWork
```

**Key decision:** Repository interfaces live in **Domain** (they define contracts). Implementations live in **Infrastructure** (they know about EF Core).

## Files to Create

### Domain Layer

#### 1. `TicketStar.Domain/Interfaces/IRepository.cs`

```csharp
namespace TicketStar.Domain.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    void Add(T entity);
    void Update(T entity);
    void Remove(T entity);
    IQueryable<T> Query();
    IQueryable<T> QueryIgnoreFilters();
}
```

#### 2. `TicketStar.Domain/Interfaces/IUnitOfWork.cs`

```csharp
namespace TicketStar.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitTransactionAsync(CancellationToken ct = default);
    Task RollbackTransactionAsync(CancellationToken ct = default);
}
```

#### 3. Entity-Specific Interfaces

`TicketStar.Domain/Interfaces/IUserRepository.cs`
```csharp
public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByEmailIgnoreFiltersAsync(string email, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task IncrementFailedLoginAsync(string userId, CancellationToken ct = default);
    Task LockAccountAsync(string userId, DateTime until, CancellationToken ct = default);
}
```

`TicketStar.Domain/Interfaces/IRefreshTokenRepository.cs`
```csharp
public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct = default);
    Task<RefreshToken?> GetByHashWithUserAndSessionAsync(string tokenHash, CancellationToken ct = default);
    Task<List<RefreshToken>> GetActiveByUserAsync(string userId, CancellationToken ct = default);
    Task<List<RefreshToken>> GetActiveByFamilyAsync(string familyId, CancellationToken ct = default);
}
```

`TicketStar.Domain/Interfaces/IMagicLinkRepository.cs`
```csharp
public interface IMagicLinkRepository : IRepository<MagicLink>
{
    Task<MagicLink?> GetByHashWithUserAsync(string tokenHash, CancellationToken ct = default);
}
```

`TicketStar.Domain/Interfaces/IAuthIdentityRepository.cs`
```csharp
public interface IAuthIdentityRepository : IRepository<AuthIdentity>
{
    Task<bool> HasProviderAsync(string userId, AuthProvider provider, CancellationToken ct = default);
    Task<AuthIdentity?> GetByUserAndProviderAsync(string userId, AuthProvider provider, CancellationToken ct = default);
}
```

`TicketStar.Domain/Interfaces/ISecurityEventRepository.cs`
```csharp
public interface ISecurityEventRepository : IRepository<SecurityEvent>
{
    // Just uses generic Add() — no custom queries needed yet
}
```

### Infrastructure Layer

#### 4. `TicketStar.Infrastructure/Repositories/EfRepository.cs`

Generic base implementation wrapping DbSet<T>.

#### 5. `TicketStar.Infrastructure/Repositories/EfUnitOfWork.cs`

Wraps AppDbContext.SaveChangesAsync() and transaction management.

#### 6. Entity-Specific Implementations

- `TicketStar.Infrastructure/Repositories/UserRepository.cs`
- `TicketStar.Infrastructure/Repositories/RefreshTokenRepository.cs`
- `TicketStar.Infrastructure/Repositories/MagicLinkRepository.cs`
- `TicketStar.Infrastructure/Repositories/AuthIdentityRepository.cs`
- `TicketStar.Infrastructure/Repositories/SecurityEventRepository.cs`
- `TicketStar.Infrastructure/Repositories/AuthSessionRepository.cs`

## Dependency Flow Change

**Before:** Application → Infrastructure (direct AppDbContext reference)
**After:** Application → Domain (interfaces only), Infrastructure implements Domain interfaces

**Note:** The Application.csproj currently references Infrastructure.csproj. Ideally Application only references Domain. However, this is a large refactor — for now, keep the reference but have services inject repositories instead of DbContext. Clean dependency inversion can happen in a future refactor.

## Todo

- [ ] Create Domain/Interfaces/ directory
- [ ] Create IRepository.cs generic interface
- [ ] Create IUnitOfWork.cs interface
- [ ] Create entity-specific repository interfaces
- [ ] Create Infrastructure/Repositories/ directory
- [ ] Create EfRepository.cs base implementation
- [ ] Create EfUnitOfWork.cs implementation
- [ ] Create entity-specific repository implementations
- [ ] Verify build compiles

---

**Last Updated:** 2026-02-27
