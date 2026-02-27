using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using TicketStar.API.Extensions;
using TicketStar.API.Middleware;
using TicketStar.Application.Interfaces;
using TicketStar.Infrastructure.Data;

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
    .AddMySql(connStr, name: "mysql", tags: ["db", "ready"])
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"]);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3001")
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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "TicketStar API v1"));
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

// Enable WebApplicationFactory for integration tests
public partial class Program { }
