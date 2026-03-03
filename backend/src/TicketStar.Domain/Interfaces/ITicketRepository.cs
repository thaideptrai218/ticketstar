using TicketStar.Domain.Entities;

namespace TicketStar.Domain.Interfaces;

public interface ITicketRepository : IRepository<Ticket>
{
    Task<List<Ticket>> GetByUserAsync(string userId, CancellationToken ct = default);
    Task<List<Ticket>> GetByOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<Ticket?> GetByQrCodeAsync(string qrCode, CancellationToken ct = default);
    Task<List<Ticket>> GetByEventAsync(Guid eventId, CancellationToken ct = default);
    Task UpdateCheckedInAsync(Guid ticketId, bool isCheckedIn, CancellationToken ct = default);
}
