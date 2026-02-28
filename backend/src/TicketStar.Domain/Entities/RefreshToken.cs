namespace TicketStar.Domain.Entities;

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;
    public Guid SessionId { get; set; }

    /// <summary>SHA-256 hash of the token. Never store plaintext.</summary>
    public string TokenHash { get; set; } = null!;

    /// <summary>Groups tokens in a rotation chain. Revoke entire family on reuse detection.</summary>
    public string FamilyId { get; set; } = Guid.NewGuid().ToString("N");

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    /// <summary>Optimistic concurrency token — prevents two simultaneous refreshes corrupting state.</summary>
    public DateTime? RowVersion { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt is not null;
    public bool IsActive => !IsExpired && !IsRevoked;

    // Navigation
    public User User { get; set; } = null!;
    public AuthSession Session { get; set; } = null!;
}
