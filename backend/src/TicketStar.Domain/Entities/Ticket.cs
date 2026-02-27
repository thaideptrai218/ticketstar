namespace TicketStar.Domain.Entities;

public class Ticket
{
    public Guid Id { get; set; }
    public Guid OrderItemId { get; set; }
    public string UserId { get; set; } = null!;
    public Guid EventId { get; set; }
    public Guid TicketTypeId { get; set; }
    public string QrCode { get; set; } = null!;
    public bool IsCheckedIn { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public OrderItem OrderItem { get; set; } = null!;
    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
    public TicketType TicketType { get; set; } = null!;
    public CheckIn? CheckIn { get; set; }
}
