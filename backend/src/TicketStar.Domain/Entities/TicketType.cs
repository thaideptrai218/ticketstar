namespace TicketStar.Domain.Entities;

public class TicketType
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = null!;
    public decimal Price { get; set; }
    public int Quota { get; set; }
    public int SoldCount { get; set; }
    public DateTime? SaleStartAt { get; set; }
    public DateTime? SaleEndAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public Event Event { get; set; } = null!;
    public ICollection<OrderItem> OrderItems { get; set; } = [];
    public ICollection<Ticket> Tickets { get; set; } = [];
}
