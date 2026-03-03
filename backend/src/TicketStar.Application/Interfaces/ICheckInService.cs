using TicketStar.Application.Common;
using TicketStar.Application.DTOs.CheckIn;

namespace TicketStar.Application.Interfaces;

public interface ICheckInService
{
    Task<Result<CheckInResponse>> ScanTicketAsync(string qrCode, string scannerId, Guid eventId, CancellationToken ct);
    Task<Result<List<CheckInResponse>>> GetEventCheckInsAsync(Guid eventId, CancellationToken ct);
    Task<Result<EventCheckInStatsResponse>> GetEventStatsAsync(Guid eventId, CancellationToken ct);
}
