using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Auth entities
    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<AuthIdentity> AuthIdentities => Set<AuthIdentity>();
    public DbSet<AuthSession> AuthSessions => Set<AuthSession>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<MagicLink> MagicLinks => Set<MagicLink>();
    public DbSet<WebAuthnCredential> WebAuthnCredentials => Set<WebAuthnCredential>();
    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();
    public DbSet<EmailChangeRequest> EmailChangeRequests => Set<EmailChangeRequest>();
    public DbSet<MfaRecoveryCode> MfaRecoveryCodes => Set<MfaRecoveryCode>();

    // Business entities
    public DbSet<Event> Events => Set<Event>();
    public DbSet<TicketType> TicketTypes => Set<TicketType>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<CheckIn> CheckIns => Set<CheckIn>();
    public DbSet<StaffAssignment> StaffAssignments => Set<StaffAssignment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Soft-delete global filter
        builder.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);
    }

    public override int SaveChanges()
    {
        SetUpdatedAt();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetUpdatedAt();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void SetUpdatedAt()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            var prop = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
            if (prop != null)
                prop.CurrentValue = DateTime.UtcNow;
        }
    }
}
