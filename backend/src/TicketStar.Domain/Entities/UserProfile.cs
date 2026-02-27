namespace TicketStar.Domain.Entities;

/// <summary>
/// PII table — separate from User for GDPR anonymization.
/// Auto-created on registration, 1:1 with User.
/// </summary>
public class UserProfile
{
    public string UserId { get; set; } = null!;
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Phone { get; set; }
    public bool PhoneVerified { get; set; }
    public string? Bio { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
