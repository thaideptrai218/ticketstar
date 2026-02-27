using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class MagicLinkConfiguration : IEntityTypeConfiguration<MagicLink>
{
    public void Configure(EntityTypeBuilder<MagicLink> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.UserId).IsRequired().HasMaxLength(450);
        builder.Property(m => m.TokenHash).IsRequired().HasMaxLength(128);
        builder.Property(m => m.IpAddress).HasMaxLength(45);

        // Optimistic concurrency via MySQL TIMESTAMP(6)
        builder.Property(m => m.RowVersion)
            .IsConcurrencyToken();

        builder.Property(m => m.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        builder.HasIndex(m => m.TokenHash).IsUnique();
        builder.HasIndex(m => new { m.UserId, m.CreatedAt });

        builder.Ignore(m => m.IsExpired);
        builder.Ignore(m => m.IsUsed);

        builder.HasOne(m => m.User)
            .WithMany(u => u.MagicLinks)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
