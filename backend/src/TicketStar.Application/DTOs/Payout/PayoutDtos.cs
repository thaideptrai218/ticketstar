namespace TicketStar.Application.DTOs.Payout;

public record PayoutSummaryResponse(
    Guid EventId,
    string EventTitle,
    decimal TotalRevenue,
    decimal PlatformFeePercent,
    decimal PlatformFeeAmount,
    decimal NetPayout,
    List<PayoutTicketTypeBreakdown> TicketTypeBreakdown
);

public record PayoutTicketTypeBreakdown(
    Guid TicketTypeId,
    string TicketTypeName,
    int TicketsSold,
    decimal UnitPrice,
    decimal Subtotal
);

public record OrganizerPayoutOverview(
    decimal TotalRevenue,
    decimal TotalFees,
    decimal TotalNetPayout,
    List<PayoutSummaryResponse> Events
);
