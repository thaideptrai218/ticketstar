namespace TicketStar.Domain.Entities;

public class MagicLink
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;

    /// <summary>SHA-256 hash of the magic link token. Never store plaintext.</summary>
    public string TokenHash { get; set; } = null!;

    public string? IpAddress { get; set; }
    public DateTime ExpiresAt { get; set; }

    /// <summary>Set when token is consumed. Null means unused. Optimistic concurrency guard prevents double-use.</summary>
    public DateTime? UsedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Optimistic concurrency token — prevents race-condition double-use of magic links.
    /// MySQL uses TIMESTAMP(6) for row versioning (not byte[] like SQL Server).</summary>
    public DateTime RowVersion { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsUsed => UsedAt is not null;

    // Navigation
    public User User { get; set; } = null!;
}
