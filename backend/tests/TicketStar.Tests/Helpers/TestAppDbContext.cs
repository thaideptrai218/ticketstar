using Microsoft.EntityFrameworkCore;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Tests.Helpers;

/// <summary>
/// Test-specific AppDbContext that patches MySQL-specific SQL to SQLite-compatible equivalents.
/// Iterates all entity properties generically — no need to enumerate entities manually.
/// </summary>
public class TestAppDbContext : AppDbContext
{
    public TestAppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Patch all MySQL-specific defaults to SQLite equivalents across every entity/property
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                var defaultSql = property.GetDefaultValueSql();
                if (defaultSql != null && defaultSql.Contains("CURRENT_TIMESTAMP("))
                {
                    // Replace MySQL CURRENT_TIMESTAMP(6) with SQLite CURRENT_TIMESTAMP
                    property.SetDefaultValueSql("CURRENT_TIMESTAMP");
                }

                var columnType = property.GetColumnType();
                if (columnType != null && columnType.StartsWith("timestamp("))
                {
                    // Replace MySQL timestamp(6) with SQLite TEXT for RowVersion/timestamp columns
                    property.SetColumnType("TEXT");
                }
            }
        }
    }
}
