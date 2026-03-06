using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Tickets;

namespace TicketStar.Application.Interfaces;

public interface ITicketService
{
    Task<Result<List<MyTicketResponse>>> GetMyTicketsAsync(string userId, CancellationToken ct);
    Task<Result<TicketDetailResponse>> GetTicketByIdAsync(Guid ticketId, string userId, CancellationToken ct);
    Task<Result<TicketDetailResponse>> TransferTicketAsync(Guid ticketId, string userId, TransferTicketRequest request, CancellationToken ct);
}
