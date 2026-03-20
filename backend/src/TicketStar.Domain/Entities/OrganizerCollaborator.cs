using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Entities;

public class OrganizerCollaborator
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? UserId { get; set; }
    public string OrganizerProfileId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public CollaboratorPermissionLevel PermissionLevel { get; set; }
    public string? InviteToken { get; set; }
    public string InvitedBy { get; set; } = null!;
    public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public CollaboratorStatus Status { get; set; } = CollaboratorStatus.Pending;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public OrganizerProfile OrganizerProfile { get; set; } = null!;
    public User Inviter { get; set; } = null!;
}
