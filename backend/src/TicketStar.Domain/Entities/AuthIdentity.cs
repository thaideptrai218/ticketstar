using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Entities;

/// <summary>
/// Provider identity linking a User to an external auth provider (email, Google, magic link).
/// One user can have multiple identities (e.g., email + Google).
/// </summary>
public class AuthIdentity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = null!;
    public AuthProvider Provider { get; set; }

    /// <summary>External user ID from provider. For email: same as user email.</summary>
    public string ProviderUserId { get; set; } = null!;

    /// <summary>Email from the provider (may differ from User.Email for OAuth).</summary>
    public string? ProviderEmail { get; set; }

    /// <summary>
    /// OAuth access token. NOT YET ENCRYPTED — AES-256 encryption deferred.
    /// Do not store long-lived tokens here until encryption is implemented.
    /// </summary>
    public string? AccessToken { get; set; }

    /// <summary>OAuth refresh token. NOT YET ENCRYPTED — see AccessToken note.</summary>
    public string? ProviderRefreshToken { get; set; }

    public DateTime? TokenExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
