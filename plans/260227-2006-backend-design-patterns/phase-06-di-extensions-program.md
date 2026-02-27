# Phase 6: DI Extensions + Program.cs Cleanup

**Status:** Pending
**Blocked By:** Phase 2, 4, 5
**Effort:** Small

---

## Overview

Extract DI registrations from Program.cs into extension methods. Program.cs becomes ~30 lines. Register all new repositories and services.

## Files to Create

### 1. `TicketStar.API/Extensions/ServiceCollectionExtensions.cs`

```csharp
namespace TicketStar.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Security — stateless, thread-safe → singleton
        services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
        services.AddSingleton<ITokenHasher, Sha256TokenHasher>();
        services.AddSingleton<ISecureRandom, CryptoRandomService>();

        // Business services — scoped (depend on DbContext)
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<DbSeeder>();

        return services;
    }

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

    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services, IConfiguration config)
    {
        // Options with startup validation
        services.AddOptions<JwtOptions>()
            .BindConfiguration(JwtOptions.SectionName)
            .Validate(o => o.Secret.Length >= 32, "JWT secret >= 32 chars")
            .ValidateOnStart();

        services.AddOptions<GoogleAuthOptions>()
            .BindConfiguration(GoogleAuthOptions.SectionName);

        // JWT bearer
        var jwtSection = config.GetSection(JwtOptions.SectionName);
        var secret = jwtSection["Secret"] ?? "";
        var issuer = jwtSection["Issuer"];
        var audience = jwtSection["Audience"];

        services.AddAuthentication(opt =>
        {
            opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(opt =>
        {
            opt.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = issuer,
                ValidAudience = audience,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(secret)),
                ClockSkew = TimeSpan.Zero
            };
        });

        return services;
    }

    public static IServiceCollection AddSwaggerWithAuth(this IServiceCollection services)
    {
        // Extract existing Swagger config from Program.cs
        services.AddSwaggerGen(c => { /* existing config */ });
        return services;
    }

    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        // Extract existing rate limiter config from Program.cs
        services.AddRateLimiter(opt => { /* existing config */ });
        return services;
    }
}
```

## Files to Modify

### 2. `TicketStar.API/Program.cs`

Reduce to:

```csharp
var builder = WebApplication.CreateBuilder(args);

// Database
var connStr = builder.Configuration.GetConnectionString("MySqlConnection")!;
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

// Application
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddRepositories();
builder.Services.AddRateLimiting();
builder.Services.AddSwaggerWithAuth();
builder.Services.AddHealthChecks()
    .AddMySql(connStr, name: "mysql", tags: new[] { "db", "ready" })
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: new[] { "live" });
builder.Services.AddControllers();
builder.Services.AddCors(options => { /* existing config */ });

var app = builder.Build();

// Seed
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    await seeder.SeedAsync(hasher.Hash);
}

// Pipeline
app.UseMiddleware<GlobalExceptionMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live")
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.Run();

public partial class Program { }
```

## Todo

- [ ] Create Extensions/ directory in API project
- [ ] Create ServiceCollectionExtensions.cs
- [ ] Extract all DI registrations from Program.cs
- [ ] Add repository registrations
- [ ] Clean up Program.cs
- [ ] Add health check endpoint mappings
- [ ] Verify build compiles
- [ ] Run tests

---

**Last Updated:** 2026-02-27
