namespace TicketStar.Domain.Entities;

public class MfaRecoveryCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;

    /// <summary>SHA-256 hash of the plaintext recovery code.</summary>
    public string CodeHash { get; set; } = null!;

    public DateTime? UsedAt { get; set; }
    public bool IsUsed => UsedAt is not null;

    // Navigation
    public User User { get; set; } = null!;
}
