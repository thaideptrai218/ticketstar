# Phase 2: Options Pattern + Health Checks

**Status:** Pending
**Blocked By:** None
**Effort:** Small

---

## Overview

Replace magic string config lookups with strongly-typed options classes. Add health check endpoints for deployment readiness.

## Files to Create

### 1. `TicketStar.Application/Options/JwtOptions.cs`

```csharp
namespace TicketStar.Application.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; init; } = "";
    public string Issuer { get; init; } = "";
    public string Audience { get; init; } = "";
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 7;
}
```

### 2. `TicketStar.Application/Options/GoogleAuthOptions.cs`

```csharp
namespace TicketStar.Application.Options;

public class GoogleAuthOptions
{
    public const string SectionName = "Google";
    public string ClientId { get; init; } = "";
}
```

## Files to Modify

### 3. `TicketStar.Application/Services/TokenService.cs`

- Replace `IConfiguration` injection with `IOptions<JwtOptions>`
- Replace `_config["Jwt:Secret"]` → `_jwtOptions.Secret`
- Replace `_config.GetValue("Jwt:ExpiryMinutes", 15)` → `_jwtOptions.AccessTokenMinutes`
- Add `Microsoft.Extensions.Options` using

### 4. `TicketStar.Application/Services/AuthService.cs`

- Replace `IConfiguration` injection with `IOptions<GoogleAuthOptions>`
- Replace `_config["Google:ClientId"]` → `_googleOptions.ClientId`
- Remove `IConfiguration` dependency

### 5. `TicketStar.API/Program.cs`

- Add options registration with startup validation:
  ```csharp
  builder.Services.AddOptions<JwtOptions>()
      .BindConfiguration(JwtOptions.SectionName)
      .Validate(o => o.Secret.Length >= 32, "JWT secret must be at least 32 characters")
      .ValidateOnStart();
  ```
- Add health checks:
  ```csharp
  builder.Services.AddHealthChecks()
      .AddMySql(connStr, name: "mysql", tags: new[] { "db", "ready" })
      .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" });
  ```
- Map health endpoints

### 6. NuGet Package

- Add `AspNetCore.HealthChecks.MySql` to API project

## Todo

- [ ] Create JwtOptions.cs
- [ ] Create GoogleAuthOptions.cs
- [ ] Update TokenService to use IOptions<JwtOptions>
- [ ] Update AuthService to use IOptions<GoogleAuthOptions>
- [ ] Register options with validation in Program.cs
- [ ] Add health check NuGet package
- [ ] Configure health check endpoints
- [ ] Verify build compiles

---

**Last Updated:** 2026-02-27
