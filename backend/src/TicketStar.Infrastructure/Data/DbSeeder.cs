using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;

namespace TicketStar.Infrastructure.Data;

public class DbSeeder
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<DbSeeder> _logger;

    public DbSeeder(AppDbContext db, IConfiguration config, ILogger<DbSeeder> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task SeedAsync(Func<string, string> hashPassword)
    {
        var adminEmail = _config["Admin:Email"] ?? "admin@ticketstar.dev";
        var adminPassword = _config["Admin:Password"] ?? "Admin@123!";

        // Skip if admin already exists (ignoring soft-delete filter)
        var exists = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == adminEmail);

        if (exists)
        {
            _logger.LogInformation("Admin user already exists, skipping seed.");
            return;
        }

        var adminId = Guid.NewGuid().ToString();

        var user = new User
        {
            Id = adminId,
            Email = adminEmail,
            PasswordHash = hashPassword(adminPassword),
            Role = UserRole.Admin,
            EmailVerified = true,
            SecurityStamp = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var profile = new UserProfile
        {
            UserId = adminId,
            FullName = "System Admin",
            UpdatedAt = DateTime.UtcNow
        };

        var identity = new AuthIdentity
        {
            Id = Guid.NewGuid(),
            UserId = adminId,
            Provider = AuthProvider.Email,
            ProviderUserId = adminEmail,
            ProviderEmail = adminEmail,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        _db.UserProfiles.Add(profile);
        _db.AuthIdentities.Add(identity);

        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin user seeded: {Email}", adminEmail);
    }
}
