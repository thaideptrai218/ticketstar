using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Tests.Helpers;

/// <summary>
/// Test-specific AppDbContext that configures SQLite-compatible default values.
/// Overrides MySQL-specific SQL functions (CURRENT_TIMESTAMP(6)) with SQLite-compatible syntax.
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

        // Override all MySQL-specific default value SQL with SQLite equivalents
        // Replace CURRENT_TIMESTAMP(6) with CURRENT_TIMESTAMP for all entities that have timestamp columns
        OverrideTimestamps(builder, builder.Entity<User>());
        OverrideTimestamps(builder, builder.Entity<UserProfile>());
        OverrideTimestamps(builder, builder.Entity<AuthIdentity>());
        OverrideTimestamps(builder, builder.Entity<AuthSession>());
        OverrideTimestamps(builder, builder.Entity<RefreshToken>());
        OverrideTimestamps(builder, builder.Entity<MagicLink>());
        OverrideTimestamps(builder, builder.Entity<SecurityEvent>());
        OverrideTimestamps(builder, builder.Entity<EmailChangeRequest>());
        OverrideTimestamps(builder, builder.Entity<Event>());
        OverrideTimestamps(builder, builder.Entity<TicketType>());
        OverrideTimestamps(builder, builder.Entity<Ticket>());
        OverrideTimestamps(builder, builder.Entity<Order>());
        OverrideTimestamps(builder, builder.Entity<OrderItem>());
        OverrideTimestamps(builder, builder.Entity<Payment>());
        OverrideTimestamps(builder, builder.Entity<CheckIn>());
        OverrideTimestamps(builder, builder.Entity<StaffAssignment>());
        OverrideTimestamps(builder, builder.Entity<WebAuthnCredential>());
    }

    private void OverrideTimestamps<T>(ModelBuilder builder, EntityTypeBuilder<T> entity) where T : class
    {
        try
        {
            var createdAtProp = entity.Property("CreatedAt");
            createdAtProp.Metadata.SetDefaultValueSql("CURRENT_TIMESTAMP");
        }
        catch { }

        try
        {
            var updatedAtProp = entity.Property("UpdatedAt");
            updatedAtProp.Metadata.SetDefaultValueSql("CURRENT_TIMESTAMP");
        }
        catch { }
    }
}
