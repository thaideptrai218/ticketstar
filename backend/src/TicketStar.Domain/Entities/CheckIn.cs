namespace TicketStar.Domain.Entities;

public class CheckIn
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public string ScannedBy { get; set; } = null!;
    public DateTime ScannedAt { get; set; }
    public Guid EventId { get; set; }

    // Navigation properties
    public Ticket Ticket { get; set; } = null!;
    public ApplicationUser Scanner { get; set; } = null!;
    public Event Event { get; set; } = null!;
}
