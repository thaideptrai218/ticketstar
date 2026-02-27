using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Entities;

/// <summary>
/// Immutable audit log of security-relevant actions.
/// UserId is nullable — failed logins targeting non-existent users still get logged.
/// </summary>
public class SecurityEvent
{
    public long Id { get; set; }
    public string? UserId { get; set; }
    public SecurityEventType EventType { get; set; }
    public bool Success { get; set; } = true;
    public string? FailureReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    /// <summary>Optional JSON metadata for event-specific details (e.g., old/new role).</summary>
    public string? Metadata { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation (nullable — failed logins may not have a user)
    public User? User { get; set; }
}
