namespace TicketStar.Domain.Entities;

/// <summary>
/// Future-ready stub for WebAuthn/Passkey support.
/// No service implementation until MFA phase.
/// </summary>
public class WebAuthnCredential
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;

    /// <summary>Base64url-encoded credential ID from authenticator.</summary>
    public string CredentialId { get; set; } = null!;

    /// <summary>CBOR-encoded public key.</summary>
    public byte[] PublicKey { get; set; } = [];

    public long SignCount { get; set; }
    public string? DeviceName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
