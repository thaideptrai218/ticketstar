using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Entities;

public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Email { get; set; } = null!;
    public bool EmailVerified { get; set; }

    /// <summary>Argon2id hash. Null for OAuth-only users.</summary>
    public string? PasswordHash { get; set; }

    public UserRole Role { get; set; } = UserRole.User;

    /// <summary>
    /// Whether the user has organizer capability. Independent of Role — any user (including Staff/Admin)
    /// can be an organizer. Admins always have implicit organizer access regardless of this flag.
    /// </summary>
    public bool IsOrganizer { get; set; }

    /// <summary>Random GUID rotated on password/email/role change. Embedded in JWT for revocation.</summary>
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    public int FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public bool IsLocked => LockedUntil.HasValue && LockedUntil > DateTime.UtcNow;

    // MFA
    public bool MfaEnabled { get; set; }

    // Auth navigation properties
    public UserProfile? Profile { get; set; }
    public ICollection<AuthIdentity> AuthIdentities { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
    public ICollection<MagicLink> MagicLinks { get; set; } = [];
    public ICollection<AuthSession> AuthSessions { get; set; } = [];
    public ICollection<SecurityEvent> SecurityEvents { get; set; } = [];
    public ICollection<EmailChangeRequest> EmailChangeRequests { get; set; } = [];

    // Business entity navigation
    public ICollection<Event> OrganizedEvents { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
    public ICollection<Ticket> Tickets { get; set; } = [];
    public ICollection<StaffAssignment> StaffAssignments { get; set; } = [];
}
