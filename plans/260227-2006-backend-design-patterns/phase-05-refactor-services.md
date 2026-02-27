# Phase 5: Refactor Services to Use Result + Repository

**Status:** Pending
**Blocked By:** Phase 1, 3, 4
**Effort:** Medium

---

## Overview

Refactor AuthService, TokenService, SessionService to return `Result<T>` instead of throwing exceptions, and inject repositories instead of AppDbContext. Update AuthController to inherit ApiControllerBase and use one-liner FromResult calls.

## Files to Modify

### 1. `TicketStar.Application/Interfaces/IAuthService.cs`

Change return types:

```csharp
// Before
Task<TokenResponse> RegisterAsync(RegisterRequest request, string? ip, string? ua);
Task<TokenResponse> LoginAsync(LoginRequest request, string? ip, string? ua);
Task<TokenResponse> GoogleLoginAsync(string idToken, string? ip, string? ua);
Task RequestMagicLinkAsync(string email, string? ip);
Task<TokenResponse> VerifyMagicLinkAsync(string token, string? ip, string? ua);
Task LogoutAsync(string refreshToken);
Task RevokeAllSessionsAsync(string userId);

// After
Task<Result<TokenResponse>> RegisterAsync(RegisterRequest request, string? ip, string? ua);
Task<Result<TokenResponse>> LoginAsync(LoginRequest request, string? ip, string? ua);
Task<Result<TokenResponse>> GoogleLoginAsync(string idToken, string? ip, string? ua);
Task<Result> RequestMagicLinkAsync(string email, string? ip);
Task<Result<TokenResponse>> VerifyMagicLinkAsync(string token, string? ip, string? ua);
Task<Result> LogoutAsync(string refreshToken);
Task<Result> RevokeAllSessionsAsync(string userId);
```

### 2. `TicketStar.Application/Interfaces/ITokenService.cs`

```csharp
// Before
Task<TokenResponse> RefreshTokenAsync(string refreshToken);

// After
Task<Result<TokenResponse>> RefreshTokenAsync(string refreshToken);
```

### 3. `TicketStar.Application/Services/AuthService.cs`

- Replace `AppDbContext _db` with repository interfaces + `IUnitOfWork`
- Replace `throw new InvalidOperationException(...)` with `return Result<T>.Failure(..., 409)`
- Replace `throw new UnauthorizedAccessException(...)` with `return Result<T>.Failure(..., 401)`
- Replace `_db.Users.IgnoreQueryFilters()` with `_userRepo.QueryIgnoreFilters()` or specific repo methods
- Replace `_db.SaveChangesAsync()` with `_unitOfWork.SaveChangesAsync()`
- Replace `_db.Database.BeginTransactionAsync()` with `_unitOfWork.BeginTransactionAsync()`

### 4. `TicketStar.Application/Services/TokenService.cs`

- Replace `AppDbContext` with `IRefreshTokenRepository`, `IUnitOfWork`
- Replace `throw new UnauthorizedAccessException(...)` with `Result<T>.Failure(..., 401)`
- Replace `IConfiguration` with `IOptions<JwtOptions>` (from Phase 2)

### 5. `TicketStar.Application/Services/SessionService.cs`

- Replace `AppDbContext` with `IRepository<AuthSession>`, `IUnitOfWork`

### 6. `TicketStar.API/Controllers/AuthController.cs`

- Inherit from `ApiControllerBase` instead of `ControllerBase`
- Remove all try/catch blocks
- Use `FromResult()` and `CreatedFromResult()` helpers

```csharp
// Before
[HttpPost("register")]
public async Task<ActionResult<TokenResponse>> Register([FromBody] RegisterRequest request)
{
    try
    {
        var response = await _authService.RegisterAsync(request, GetIp(), GetUserAgent());
        return Ok(response);
    }
    catch (InvalidOperationException ex)
    {
        return Conflict(new { error = ex.Message });
    }
}

// After
[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    => FromResult(await _authService.RegisterAsync(request, GetIp(), GetUserAgent()));
```

### 7. HTTP Status Code Fixes (#10)

- Register: return 201 via `CreatedFromResult()` (not 200)
- Logout: return message via `FromResult(result, "Logged out successfully.")`
- Revoke all: return message via `FromResult(result, "All sessions revoked.")`

## Test Impact

Existing 35 unit tests test security services (password hasher, token hasher, crypto random) — these are unaffected. Any integration tests for AuthService would need updating for Result return types.

## Todo

- [ ] Update IAuthService interface signatures
- [ ] Update ITokenService interface signatures
- [ ] Refactor AuthService: inject repos, return Results
- [ ] Refactor TokenService: inject repos, return Results, use JwtOptions
- [ ] Refactor SessionService: inject repo instead of DbContext
- [ ] Update AuthController: inherit ApiControllerBase, remove try/catch
- [ ] Fix HTTP status codes (Register → 201)
- [ ] Verify build compiles
- [ ] Run existing tests

---

**Last Updated:** 2026-02-27
