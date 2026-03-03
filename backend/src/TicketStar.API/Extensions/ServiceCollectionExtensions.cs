using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;
using TicketStar.API.RateLimiting;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Application.Services;
using TicketStar.Application.Services.Security;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Cache;
using TicketStar.Infrastructure.Data;
using TicketStar.Infrastructure.Repositories;

namespace TicketStar.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Security — stateless, thread-safe → singleton
        services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
        services.AddSingleton<ITokenHasher, Sha256TokenHasher>();
        services.AddSingleton<ISecureRandom, CryptoRandomService>();

        // Cache abstractions (Redis-backed)
        services.AddScoped<IGracePeriodCache, TicketStar.Application.Services.RedisGracePeriodCache>();
        services.AddSingleton<ITokenBlacklist, TicketStar.Application.Services.RedisTokenBlacklist>();

        // Business services — scoped (depend on DbContext)
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IMfaService, MfaService>();
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
            .Validate(o => o.Secret.Length >= 32, "JWT secret must be at least 32 characters")
            .ValidateOnStart();

        services.AddOptions<GoogleAuthOptions>()
            .BindConfiguration(GoogleAuthOptions.SectionName);

        services.AddOptions<MfaOptions>()
            .BindConfiguration(MfaOptions.SectionName);

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
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ClockSkew = TimeSpan.Zero
            };

            // C2: Reject MFA challenge tokens — they must not be used as access tokens.
            opt.Events = new JwtBearerEvents
            {
                OnTokenValidated = ctx =>
                {
                    var purpose = ctx.Principal?.Claims
                        .FirstOrDefault(c => c.Type == "purpose")?.Value;
                    if (purpose == "mfa_challenge")
                        ctx.Fail("MFA challenge tokens cannot be used as access tokens.");
                    return Task.CompletedTask;
                }
            };
        });

        return services;
    }

    public static IServiceCollection AddSwaggerWithAuth(this IServiceCollection services)
    {
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = "TicketStar API", Version = "v1" });
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header
            });
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }

    public static IConnectionMultiplexer AddRedis(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<RedisOptions>()
            .BindConfiguration(RedisOptions.SectionName)
            .ValidateOnStart();

        var connStr = config.GetSection(RedisOptions.SectionName)["ConnectionString"]
                      ?? "localhost:6379";

        // Connect with AbortOnConnectFail=false so startup doesn't crash when Redis is down.
        // The multiplexer will retry in background; rate limiting and cache methods fail-open.
        var opts = ConfigurationOptions.Parse(connStr);
        opts.AbortOnConnectFail = false;
        var multiplexer = ConnectionMultiplexer.Connect(opts);

        services.AddSingleton<IConnectionMultiplexer>(multiplexer);
        services.AddSingleton<IRedisService, RedisService>();

        return multiplexer;
    }

    public static IServiceCollection AddRateLimiting(
        this IServiceCollection services, IConnectionMultiplexer redis)
    {
        services.AddRateLimiter(opt =>
        {
            opt.AddPolicy("login",
                new RedisRateLimiterPolicy(redis, "login", permitLimit: 10, TimeSpan.FromMinutes(5)));
            opt.AddPolicy("register",
                new RedisRateLimiterPolicy(redis, "register", permitLimit: 5, TimeSpan.FromMinutes(15)));
            opt.AddPolicy("refresh",
                new RedisRateLimiterPolicy(redis, "refresh", permitLimit: 120, TimeSpan.FromMinutes(5)));
            opt.AddPolicy("magic-link",
                new RedisRateLimiterPolicy(redis, "magic-link", permitLimit: 5, TimeSpan.FromMinutes(15)));

            opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        return services;
    }
}
