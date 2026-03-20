using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class OrganizerCollaboratorConfiguration : IEntityTypeConfiguration<OrganizerCollaborator>
{
    public void Configure(EntityTypeBuilder<OrganizerCollaborator> builder)
    {
        builder.ToTable("OrganizerCollaborators");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasMaxLength(450);
        builder.Property(x => x.UserId).HasMaxLength(450);
        builder.Property(x => x.OrganizerProfileId).IsRequired().HasMaxLength(450);
        builder.Property(x => x.Email).IsRequired().HasMaxLength(256);
        builder.Property(x => x.InvitedBy).IsRequired().HasMaxLength(450);
        builder.Property(x => x.InviteToken).HasMaxLength(128);

        builder.Property(x => x.PermissionLevel)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.InvitedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        builder.HasIndex(x => new { x.UserId, x.OrganizerProfileId }).IsUnique().HasFilter(null);
        builder.HasIndex(x => new { x.Email, x.OrganizerProfileId }).IsUnique();
        builder.HasIndex(x => x.InviteToken).IsUnique().HasFilter(null);
        builder.HasIndex(x => x.OrganizerProfileId);

        builder.HasOne(x => x.OrganizerProfile)
            .WithMany(op => op.Collaborators)
            .HasForeignKey(x => x.OrganizerProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Inviter)
            .WithMany()
            .HasForeignKey(x => x.InvitedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
