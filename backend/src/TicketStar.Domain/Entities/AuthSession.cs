namespace TicketStar.Domain.Entities;

/// <summary>
/// Tracks active user sessions. Session ID embedded in JWT `sid` claim
/// to enable per-session revocation ("sign out this device").
/// </summary>
public class AuthSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    /// <summary>SHA-256(IP + UserAgent + Accept-Language). Used for device tracking.</summary>
    public string? DeviceFingerprint { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
