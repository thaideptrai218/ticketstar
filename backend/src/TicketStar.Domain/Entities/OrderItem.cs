namespace TicketStar.Domain.Entities;

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid TicketTypeId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Order Order { get; set; } = null!;
    public TicketType TicketType { get; set; } = null!;
    public ICollection<Ticket> Tickets { get; set; } = [];
}
