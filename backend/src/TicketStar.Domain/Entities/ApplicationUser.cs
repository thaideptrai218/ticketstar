using Microsoft.AspNetCore.Identity;

namespace TicketStar.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsLocked { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public ICollection<Event> OrganizedEvents { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
    public ICollection<Ticket> Tickets { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
    public ICollection<MagicLinkToken> MagicLinkTokens { get; set; } = [];
    public ICollection<StaffAssignment> StaffAssignments { get; set; } = [];
}
