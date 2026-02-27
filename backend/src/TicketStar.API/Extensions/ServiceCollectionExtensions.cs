using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Application.Services;
using TicketStar.Application.Services.Security;
using TicketStar.Domain.Interfaces;
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
            .Validate(o => o.Secret.Length >= 32, "JWT secret must be at least 32 characters")
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
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ClockSkew = TimeSpan.Zero
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

    public static IServiceCollection AddRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(opt =>
        {
            opt.AddPolicy("magic-link", ctx =>
                RateLimitPartition.GetFixedWindowLimiter(
                    ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(15),
                        QueueLimit = 0
                    }));
            opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        return services;
    }
}
