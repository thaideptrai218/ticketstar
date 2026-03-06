using Microsoft.EntityFrameworkCore;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Payout;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class PayoutService : IPayoutService
{
    private readonly IEventRepository _eventRepo;
    private const decimal PlatformFeePercent = 5m;

    public PayoutService(IEventRepository eventRepo)
    {
        _eventRepo = eventRepo;
    }

    public async Task<Result<PayoutSummaryResponse>> GetEventPayoutAsync(string organizerId, Guid eventId, CancellationToken ct)
    {
        var eventEntity = await _eventRepo.Query()
            .Include(e => e.TicketTypes)
            .FirstOrDefaultAsync(e => e.Id == eventId, ct);

        if (eventEntity == null)
            return Result<PayoutSummaryResponse>.Failure("Event not found", ResultError.NotFound);

        if (eventEntity.OrganizerId != organizerId)
            return Result<PayoutSummaryResponse>.Failure("Not authorized", ResultError.Forbidden);

        var breakdown = eventEntity.TicketTypes.Select(tt =>
        {
            var sold = tt.SoldCount;
            return new PayoutTicketTypeBreakdown(tt.Id, tt.Name, sold, tt.Price, sold * tt.Price);
        }).ToList();

        var totalRevenue = breakdown.Sum(b => b.Subtotal);
        var feeAmount = Math.Round(totalRevenue * PlatformFeePercent / 100m, 0);

        return Result<PayoutSummaryResponse>.Success(new PayoutSummaryResponse(
            eventId,
            eventEntity.Title,
            totalRevenue,
            PlatformFeePercent,
            feeAmount,
            totalRevenue - feeAmount,
            breakdown
        ));
    }

    public async Task<Result<OrganizerPayoutOverview>> GetOrganizerPayoutSummaryAsync(string organizerId, CancellationToken ct)
    {
        var events = await _eventRepo.Query()
            .Include(e => e.TicketTypes)
            .Where(e => e.OrganizerId == organizerId)
            .ToListAsync(ct);

        var summaries = new List<PayoutSummaryResponse>();
        foreach (var evt in events)
        {
            var breakdown = evt.TicketTypes.Select(tt =>
                new PayoutTicketTypeBreakdown(tt.Id, tt.Name, tt.SoldCount, tt.Price, tt.SoldCount * tt.Price)
            ).ToList();

            var totalRevenue = breakdown.Sum(b => b.Subtotal);
            var feeAmount = Math.Round(totalRevenue * PlatformFeePercent / 100m, 0);

            summaries.Add(new PayoutSummaryResponse(
                evt.Id, evt.Title, totalRevenue, PlatformFeePercent, feeAmount, totalRevenue - feeAmount, breakdown
            ));
        }

        return Result<OrganizerPayoutOverview>.Success(new OrganizerPayoutOverview(
            summaries.Sum(s => s.TotalRevenue),
            summaries.Sum(s => s.PlatformFeeAmount),
            summaries.Sum(s => s.NetPayout),
            summaries
        ));
    }
}
