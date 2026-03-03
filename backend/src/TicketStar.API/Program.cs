using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using TicketStar.API.Extensions;
using TicketStar.API.Middleware;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Database
var connStr = builder.Configuration.GetConnectionString("MySqlConnection")!;
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

// Application
builder.Services.AddJwtAuthentication(builder.Configuration);
var redisMultiplexer = builder.Services.AddRedis(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddRepositories();

// Health checks - create builder before MassTransit to pass it in
var redisConnStr = builder.Configuration.GetSection("Redis")["ConnectionString"] ?? "localhost:6379";
var healthChecksBuilder = builder.Services.AddHealthChecks()
    .AddMySql(connStr, name: "mysql", tags: ["db", "ready"])
    .AddRedis(redisConnStr, name: "redis", tags: ["infra", "ready"])
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"]);
builder.Services.AddMassTransitWithRabbitMQ(builder.Configuration, healthChecksBuilder);
builder.Services.AddSwaggerWithAuth();
builder.Services.AddRateLimiting(redisMultiplexer);

// Phase 3: Backend API options
builder.Services.AddOptions<QrOptions>()
    .BindConfiguration(QrOptions.SectionName)
    .Validate(o => o.HmacSecret.Length >= 32, "QR HMAC secret must be at least 32 characters")
    .ValidateOnStart();

builder.Services.AddOptions<SePayOptions>()
    .BindConfiguration(SePayOptions.SectionName);
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Seed database
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    await seeder.SeedAsync(hasher.Hash);
}

// Pipeline
app.UseMiddleware<GlobalExceptionMiddleware>();

// H1: HTTPS enforcement + HSTS (production only — dev uses HTTP)
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

// H2: Security response headers on every response
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("X-XSS-Protection", "0"); // deprecated — rely on CSP
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "TicketStar API v1"));
}
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseMiddleware<TokenBlacklistMiddleware>();
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

// Enable WebApplicationFactory for integration tests
public partial class Program { }
