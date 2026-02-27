using System.Security.Cryptography;
using System.Text;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class SessionService : ISessionService
{
    private readonly IRepository<AuthSession> _sessionRepo;
    private readonly IUnitOfWork _unitOfWork;

    public SessionService(IRepository<AuthSession> sessionRepo, IUnitOfWork unitOfWork)
    {
        _sessionRepo = sessionRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<AuthSession> CreateSessionAsync(
        string userId, string? ipAddress, string? userAgent)
    {
        var session = new AuthSession
        {
            UserId = userId,
            IpAddress = ipAddress,
            UserAgent = userAgent?.Length > 512 ? userAgent[..512] : userAgent,
            DeviceFingerprint = ComputeFingerprint(ipAddress, userAgent),
        };

        _sessionRepo.Add(session);
        await _unitOfWork.SaveChangesAsync();
        return session;
    }

    public async Task<AuthSession?> GetSessionAsync(Guid sessionId)
        => await _sessionRepo.GetByIdAsync(sessionId);

    public async Task DeactivateSessionAsync(Guid sessionId)
    {
        var session = await _sessionRepo.GetByIdAsync(sessionId);
        if (session is { IsActive: true })
        {
            session.IsActive = false;
            session.RevokedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
        }
    }

    public async Task DeactivateAllSessionsAsync(string userId)
    {
        var sessions = await _sessionRepo.ListAsync(s => s.UserId == userId && s.IsActive);

        var now = DateTime.UtcNow;
        foreach (var s in sessions)
        {
            s.IsActive = false;
            s.RevokedAt = now;
        }
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task UpdateActivityAsync(Guid sessionId)
    {
        var session = await _sessionRepo.GetByIdAsync(sessionId);
        if (session is not null)
        {
            session.LastActivityAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
        }
    }

    private static string? ComputeFingerprint(string? ip, string? ua)
    {
        if (string.IsNullOrEmpty(ip) && string.IsNullOrEmpty(ua)) return null;
        var raw = $"{ip}|{ua}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
