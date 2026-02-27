using TicketStar.Domain.Entities;

namespace TicketStar.Application.Interfaces;

public interface ISessionService
{
    Task<AuthSession> CreateSessionAsync(string userId, string? ipAddress, string? userAgent);
    Task<AuthSession?> GetSessionAsync(Guid sessionId);
    Task DeactivateSessionAsync(Guid sessionId);
    Task DeactivateAllSessionsAsync(string userId);
    Task UpdateActivityAsync(Guid sessionId);
}
