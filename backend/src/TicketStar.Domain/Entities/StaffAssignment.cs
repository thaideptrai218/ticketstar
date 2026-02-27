namespace TicketStar.Domain.Entities;

public class StaffAssignment
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = null!;
    public Guid EventId { get; set; }
    public string AssignedBy { get; set; } = null!;
    public DateTime AssignedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
    public User Assigner { get; set; } = null!;
}
