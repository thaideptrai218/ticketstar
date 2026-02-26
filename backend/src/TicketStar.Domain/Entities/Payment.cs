using TicketStar.Domain.Enums;

namespace TicketStar.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string Provider { get; set; } = null!;
    public string? ExternalRef { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public Order Order { get; set; } = null!;
}
