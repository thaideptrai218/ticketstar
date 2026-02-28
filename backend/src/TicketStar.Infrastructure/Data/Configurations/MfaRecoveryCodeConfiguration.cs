using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class MfaRecoveryCodeConfiguration : IEntityTypeConfiguration<MfaRecoveryCode>
{
    public void Configure(EntityTypeBuilder<MfaRecoveryCode> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).IsRequired().HasMaxLength(36);
        builder.Property(x => x.CodeHash).IsRequired().HasMaxLength(64);
        builder.Property(x => x.UsedAt);

        builder.HasIndex(x => x.UserId);

        builder.HasOne(x => x.User)
            .WithMany(u => u.MfaRecoveryCodes)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable("MfaRecoveryCodes");
    }
}
