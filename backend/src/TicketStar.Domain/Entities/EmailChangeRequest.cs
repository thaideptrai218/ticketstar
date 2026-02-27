namespace TicketStar.Domain.Entities;

/// <summary>
/// Pending email change verification. Token expires and single-use.
/// </summary>
public class EmailChangeRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;
    public string NewEmail { get; set; } = null!;

    /// <summary>SHA-256 hash of the verification token.</summary>
    public string TokenHash { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
