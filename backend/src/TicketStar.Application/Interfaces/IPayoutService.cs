using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Payout;

namespace TicketStar.Application.Interfaces;

public interface IPayoutService
{
    Task<Result<PayoutSummaryResponse>> GetEventPayoutAsync(string organizerId, Guid eventId, CancellationToken ct);
    Task<Result<OrganizerPayoutOverview>> GetOrganizerPayoutSummaryAsync(string organizerId, CancellationToken ct);
}
