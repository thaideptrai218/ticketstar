using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasMaxLength(450);

        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.Property(u => u.PasswordHash).HasMaxLength(500);
        builder.Property(u => u.SecurityStamp).IsRequired().HasMaxLength(100);
        builder.Property(u => u.FailedLoginCount).HasDefaultValue(0);

        builder.Property(u => u.Role)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(u => u.IsOrganizer).HasDefaultValue(false);

        builder.Property(u => u.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");
        builder.Property(u => u.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.DeletedAt);

        builder.Ignore(u => u.IsLocked);

        builder.HasOne(u => u.Profile)
            .WithOne(p => p.User)
            .HasForeignKey<UserProfile>(p => p.UserId);
    }
}
