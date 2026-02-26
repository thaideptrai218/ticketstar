namespace TicketStar.Domain.Entities;

public class MagicLinkToken
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = null!;
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public ApplicationUser User { get; set; } = null!;
}
