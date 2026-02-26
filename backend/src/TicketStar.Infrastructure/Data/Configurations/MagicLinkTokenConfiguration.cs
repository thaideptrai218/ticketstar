using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class MagicLinkTokenConfiguration : IEntityTypeConfiguration<MagicLinkToken>
{
    public void Configure(EntityTypeBuilder<MagicLinkToken> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.UserId).HasMaxLength(450).IsRequired();
        builder.Property(m => m.Token).HasMaxLength(500).IsRequired();
        builder.Property(m => m.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        builder.HasIndex(m => m.Token).IsUnique();

        builder.HasOne(m => m.User)
            .WithMany(u => u.MagicLinkTokens)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
