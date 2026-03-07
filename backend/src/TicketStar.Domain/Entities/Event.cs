using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Entities;

public class Event
{
    public Guid Id { get; set; }
    public string OrganizerId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public string? Venue { get; set; }
    /// <summary>Event category: Music | Sports | Arts | Technology | Food | Education</summary>
    public string? Category { get; set; }
    public EventStatus Status { get; set; }
    public string? ImageUrl { get; set; }
    public string Slug { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public User Organizer { get; set; } = null!;
    public ICollection<TicketType> TicketTypes { get; set; } = [];
    public ICollection<Ticket> Tickets { get; set; } = [];
    public ICollection<CheckIn> CheckIns { get; set; } = [];
    public ICollection<StaffAssignment> StaffAssignments { get; set; } = [];
}
