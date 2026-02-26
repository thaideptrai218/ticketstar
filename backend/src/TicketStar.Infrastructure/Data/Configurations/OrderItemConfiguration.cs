using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TicketStar.Domain.Entities;

namespace TicketStar.Infrastructure.Data.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.HasKey(oi => oi.Id);
        builder.Property(oi => oi.UnitPrice).HasColumnType("decimal(12,0)");
        builder.Property(oi => oi.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP(6)");

        builder.HasOne(oi => oi.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(oi => oi.TicketType)
            .WithMany(tt => tt.OrderItems)
            .HasForeignKey(oi => oi.TicketTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
