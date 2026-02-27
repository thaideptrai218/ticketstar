using Microsoft.EntityFrameworkCore;
using Xunit;
using TicketStar.Application.Services;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;
using TicketStar.Infrastructure.Repositories;
using TicketStar.Tests.Helpers;

namespace TicketStar.Tests.Unit.Services;

public class SessionServiceTests
{
    private AppDbContext CreateDbContext()
    {
        var factory = new TestDbContextFactory();
        return factory.CreateDbContext();
    }

    private (SessionService service, IRepository<AuthSession> repo, IUnitOfWork uow) CreateSessionService(AppDbContext db)
    {
        var repo = new EfRepository<AuthSession>(db);
        var uow = new EfUnitOfWork(db);
        return (new SessionService(repo, uow), repo, uow);
    }

    // ============ CreateSessionAsync Tests ============

    [Fact]
    public async Task CreateSessionAsync_ValidInput_CreatesSessionInDatabase()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var ipAddress = "192.168.1.100";
        var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

        // Act
        var result = await service.CreateSessionAsync(userId, ipAddress, userAgent);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.UserId);
        Assert.Equal(ipAddress, result.IpAddress);
        Assert.Equal(userAgent, result.UserAgent);
        Assert.True(result.IsActive);

        var stored = await db.AuthSessions.FindAsync(result.Id);
        Assert.NotNull(stored);
        Assert.Equal(userId, stored.UserId);
    }

    [Fact]
    public async Task CreateSessionAsync_UserAgent_TruncatedAt512Characters()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var longUserAgent = new string('x', 1000);

        // Act
        var result = await service.CreateSessionAsync(userId, "127.0.0.1", longUserAgent);

        // Assert
        Assert.NotNull(result.UserAgent);
        Assert.Equal(512, result.UserAgent.Length);
    }

    [Fact]
    public async Task CreateSessionAsync_ComputesDeviceFingerprint()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var ipAddress = "192.168.1.100";
        var userAgent = "Mozilla/5.0";

        // Act
        var result = await service.CreateSessionAsync(userId, ipAddress, userAgent);

        // Assert
        Assert.NotNull(result.DeviceFingerprint);
        Assert.NotEmpty(result.DeviceFingerprint);
        // Fingerprint should be deterministic
        var result2 = await service.CreateSessionAsync(userId, ipAddress, userAgent);
        Assert.Equal(result.DeviceFingerprint, result2.DeviceFingerprint);
    }

    [Fact]
    public async Task CreateSessionAsync_NullIpAndUserAgent_NoFingerprint()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        // Act
        var result = await service.CreateSessionAsync(userId, null, null);

        // Assert
        Assert.Null(result.DeviceFingerprint);
    }

    // ============ DeactivateSessionAsync Tests ============

    [Fact]
    public async Task DeactivateSessionAsync_ActiveSession_MarkInactive()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var session = new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
            IsActive = true,
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var sessionId = session.Id;

        // Act
        await service.DeactivateSessionAsync(sessionId);

        // Assert
        var updated = await db.AuthSessions.FindAsync(sessionId);
        Assert.False(updated!.IsActive);
        Assert.NotNull(updated.RevokedAt);
    }

    [Fact]
    public async Task DeactivateSessionAsync_AlreadyInactiveSession_DoesNothing()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var revokedAt = DateTime.UtcNow.AddMinutes(-5);
        var session = new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
            IsActive = false,
            RevokedAt = revokedAt,
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var sessionId = session.Id;

        // Act
        await service.DeactivateSessionAsync(sessionId);

        // Assert
        var updated = await db.AuthSessions.FindAsync(sessionId);
        Assert.False(updated!.IsActive);
        Assert.Equal(revokedAt, updated.RevokedAt);
    }

    [Fact]
    public async Task DeactivateSessionAsync_NonExistentSession_DoesNotThrow()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var nonExistentId = Guid.NewGuid();

        // Act - should not throw
        await service.DeactivateSessionAsync(nonExistentId);
    }

    // ============ DeactivateAllSessionsAsync Tests ============

    [Fact]
    public async Task DeactivateAllSessionsAsync_DeactivatesAllActiveSessions()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        db.AuthSessions.Add(new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
            IsActive = true,
        });
        db.AuthSessions.Add(new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.2",
            IsActive = true,
        });
        db.SaveChanges();

        // Act
        await service.DeactivateAllSessionsAsync(userId);

        // Assert
        var sessions = await db.AuthSessions
            .Where(s => s.UserId == userId)
            .ToListAsync();
        Assert.True(sessions.All(s => !s.IsActive));
        Assert.True(sessions.All(s => s.RevokedAt != null));
    }

    [Fact]
    public async Task DeactivateAllSessionsAsync_IgnoresAlreadyInactiveSessions()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var revokedAt = DateTime.UtcNow.AddMinutes(-5);
        db.AuthSessions.Add(new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
            IsActive = true,
        });
        db.AuthSessions.Add(new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.2",
            IsActive = false,
            RevokedAt = revokedAt,
        });
        db.SaveChanges();

        // Act
        await service.DeactivateAllSessionsAsync(userId);

        // Assert
        var sessions = await db.AuthSessions
            .Where(s => s.UserId == userId)
            .ToListAsync();
        Assert.True(sessions.All(s => !s.IsActive));

        var alreadyInactive = sessions.First(s => s.IpAddress == "127.0.0.2");
        Assert.Equal(revokedAt, alreadyInactive.RevokedAt);
    }

    [Fact]
    public async Task DeactivateAllSessionsAsync_NoSessionsForUser_DoesNothing()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();

        // Act - should not throw
        await service.DeactivateAllSessionsAsync(userId);

        // Assert
        var count = await db.AuthSessions
            .Where(s => s.UserId == userId)
            .CountAsync();
        Assert.Equal(0, count);
    }

    // ============ UpdateActivityAsync Tests ============

    [Fact]
    public async Task UpdateActivityAsync_UpdatesLastActivityAtTimestamp()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var session = new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var sessionId = session.Id;
        var originalLastActivity = session.LastActivityAt;
        await Task.Delay(10); // Ensure time difference

        // Act
        await service.UpdateActivityAsync(sessionId);

        // Assert
        var updated = await db.AuthSessions.FindAsync(sessionId);
        Assert.True(updated!.LastActivityAt > originalLastActivity);
    }

    [Fact]
    public async Task UpdateActivityAsync_NonExistentSession_DoesNotThrow()
    {
        // Arrange
        using var db = CreateDbContext();
        var (service, _, _) = CreateSessionService(db);

        var nonExistentId = Guid.NewGuid();

        // Act - should not throw
        await service.UpdateActivityAsync(nonExistentId);
    }
}
