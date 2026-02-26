using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class StaffAssignmentConfiguration : IEntityTypeConfiguration<StaffAssignment>
{
    public void Configure(EntityTypeBuilder<StaffAssignment> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.UserId).HasMaxLength(450).IsRequired();
        builder.Property(s => s.AssignedBy).HasMaxLength(450).IsRequired();
        builder.Property(s => s.AssignedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        builder.HasOne(s => s.User)
            .WithMany(u => u.StaffAssignments)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Event)
            .WithMany(e => e.StaffAssignments)
            .HasForeignKey(s => s.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Assigner)
            .WithMany()
            .HasForeignKey(s => s.AssignedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
