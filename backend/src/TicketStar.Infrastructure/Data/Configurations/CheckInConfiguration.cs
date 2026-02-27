using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class CheckInConfiguration : IEntityTypeConfiguration<CheckIn>
{
    public void Configure(EntityTypeBuilder<CheckIn> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.ScannedBy).IsRequired().HasMaxLength(450);

        // 1:1 with Ticket — unique FK
        builder.HasIndex(c => c.TicketId).IsUnique();
        builder.HasIndex(c => new { c.EventId, c.ScannedAt });

        builder.HasOne(c => c.Ticket)
            .WithOne(t => t.CheckIn)
            .HasForeignKey<CheckIn>(c => c.TicketId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Scanner)
            .WithMany()
            .HasForeignKey(c => c.ScannedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Event)
            .WithMany(e => e.CheckIns)
            .HasForeignKey(c => c.EventId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
