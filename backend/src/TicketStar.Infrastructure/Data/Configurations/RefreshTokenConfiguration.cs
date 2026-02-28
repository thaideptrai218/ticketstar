using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.UserId).IsRequired().HasMaxLength(450);
        builder.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
        builder.Property(t => t.FamilyId).IsRequired().HasMaxLength(100);

        builder.Property(t => t.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        // Optimistic concurrency — prevents duplicate rotation under concurrent requests.
        // MySQL doesn't support SQL Server-style IsRowVersion(); use IsConcurrencyToken instead.
        builder.Property(t => t.RowVersion)
            .IsConcurrencyToken()
            .HasColumnType("timestamp(6)")
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)")
            .ValueGeneratedOnAddOrUpdate();

        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasIndex(t => new { t.UserId, t.FamilyId });

        builder.Ignore(t => t.IsExpired);
        builder.Ignore(t => t.IsRevoked);
        builder.Ignore(t => t.IsActive);

        builder.HasOne(t => t.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Session)
            .WithMany(s => s.RefreshTokens)
            .HasForeignKey(t => t.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
