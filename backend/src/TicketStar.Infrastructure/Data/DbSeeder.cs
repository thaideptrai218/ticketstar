using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data;

public class DbSeeder
{
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;
    private readonly ILogger<DbSeeder> _logger;

    private static readonly string[] Roles = ["Admin", "Organizer", "Staff", "Attendee"];

    public DbSeeder(
        RoleManager<IdentityRole> roleManager,
        UserManager<ApplicationUser> userManager,
        IConfiguration config,
        ILogger<DbSeeder> logger)
    {
        _roleManager = roleManager;
        _userManager = userManager;
        _config = config;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        // Seed roles
        foreach (var role in Roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole(role));
                _logger.LogInformation("Seeded role: {Role}", role);
            }
        }

        // Seed admin user
        var adminEmail = _config["Admin:Email"] ?? "admin@ticketstar.dev";
        var adminUser = await _userManager.FindByEmailAsync(adminEmail);
        if (adminUser is null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "System Admin",
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow
            };
            var result = await _userManager.CreateAsync(adminUser, _config["Admin:Password"] ?? "Admin@123!");
            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(adminUser, "Admin");
                _logger.LogInformation("Seeded admin user: {Email}", adminEmail);
            }
            else
            {
                _logger.LogError("Failed to seed admin: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }
}
