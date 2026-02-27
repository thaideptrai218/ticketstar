using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Entities;

public class Order
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = null!;
    public OrderStatus Status { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
    public Payment? Payment { get; set; }
}
