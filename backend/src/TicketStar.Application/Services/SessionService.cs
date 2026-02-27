using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Application.Services;

public class SessionService : ISessionService
{
    private readonly AppDbContext _db;

    public SessionService(AppDbContext db) => _db = db;

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

        _db.AuthSessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    public async Task DeactivateSessionAsync(Guid sessionId)
    {
        var session = await _db.AuthSessions.FindAsync(sessionId);
        if (session is { IsActive: true })
        {
            session.IsActive = false;
            session.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task DeactivateAllSessionsAsync(string userId)
    {
        var sessions = await _db.AuthSessions
            .Where(s => s.UserId == userId && s.IsActive)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var s in sessions)
        {
            s.IsActive = false;
            s.RevokedAt = now;
        }
        await _db.SaveChangesAsync();
    }

    public async Task UpdateActivityAsync(Guid sessionId)
    {
        var session = await _db.AuthSessions.FindAsync(sessionId);
        if (session is not null)
        {
            session.LastActivityAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
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
