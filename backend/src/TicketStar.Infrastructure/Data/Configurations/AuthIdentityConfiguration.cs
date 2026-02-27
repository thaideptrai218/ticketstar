using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class AuthIdentityConfiguration : IEntityTypeConfiguration<AuthIdentity>
{
    public void Configure(EntityTypeBuilder<AuthIdentity> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.UserId).IsRequired().HasMaxLength(450);
        builder.Property(a => a.ProviderUserId).IsRequired().HasMaxLength(256);
        builder.Property(a => a.ProviderEmail).HasMaxLength(256);
        builder.Property(a => a.AccessToken).HasMaxLength(2000);
        builder.Property(a => a.ProviderRefreshToken).HasMaxLength(2000);

        builder.Property(a => a.Provider)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(a => a.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        builder.HasIndex(a => new { a.Provider, a.ProviderUserId }).IsUnique();
        builder.HasIndex(a => a.UserId);

        builder.HasOne(a => a.User)
            .WithMany(u => u.AuthIdentities)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
