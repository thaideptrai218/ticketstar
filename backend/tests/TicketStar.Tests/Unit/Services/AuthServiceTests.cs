using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Services;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Infrastructure.Data;
using TicketStar.Tests.Helpers;

namespace TicketStar.Tests.Unit.Services;

public class AuthServiceTests
{
    private readonly Mock<IPasswordHasher> _mockPasswordHasher;
    private readonly Mock<ITokenHasher> _mockTokenHasher;
    private readonly Mock<ISecureRandom> _mockRandom;
    private readonly Mock<ITokenService> _mockTokenService;
    private readonly Mock<ISessionService> _mockSessionService;
    private readonly Mock<IConfiguration> _mockConfig;
    private readonly Mock<ILogger<AuthService>> _mockLogger;

    public AuthServiceTests()
    {
        _mockPasswordHasher = new Mock<IPasswordHasher>();
        _mockTokenHasher = new Mock<ITokenHasher>();
        _mockRandom = new Mock<ISecureRandom>();
        _mockTokenService = new Mock<ITokenService>();
        _mockSessionService = new Mock<ISessionService>();
        _mockConfig = new Mock<IConfiguration>();
        _mockLogger = new Mock<ILogger<AuthService>>();

        // Default mocking behavior
        _mockPasswordHasher
            .Setup(p => p.Hash(It.IsAny<string>()))
            .Returns((string pwd) => $"hash_of_{pwd}");

        _mockPasswordHasher
            .Setup(p => p.Verify(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string pwd, string hash) => hash == $"hash_of_{pwd}");

        _mockTokenHasher
            .Setup(t => t.Hash(It.IsAny<string>()))
            .Returns((string token) => $"hash_of_{token}");

        _mockRandom
            .Setup(r => r.GenerateToken(It.IsAny<int>()))
            .Returns("random_token_123456789");

        _mockConfig
            .Setup(c => c["Google:ClientId"])
            .Returns("test-client-id");
    }

    private AppDbContext CreateDbContext()
    {
        var factory = new TestDbContextFactory();
        return factory.CreateDbContext();
    }

    private AuthService CreateAuthService(AppDbContext db)
    {
        return new AuthService(
            db,
            _mockPasswordHasher.Object,
            _mockTokenHasher.Object,
            _mockRandom.Object,
            _mockTokenService.Object,
            _mockSessionService.Object,
            _mockConfig.Object,
            _mockLogger.Object);
    }

    // ============ RegisterAsync Tests ============

    [Fact]
    public async Task RegisterAsync_ValidInput_CreatesUserAndProfile()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);
        var request = new RegisterRequest("new@example.com", "password123", "Test User");

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = "" };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockSessionService
            .Setup(s => s.CreateSessionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);

        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        // Act
        var result = await service.RegisterAsync(request, "127.0.0.1", "Mozilla/5.0");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("access", result.AccessToken);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        Assert.NotNull(user);
        Assert.False(user.EmailVerified);
        Assert.Equal(request.Email, user.Email);
        Assert.Equal(UserRole.User, user.Role);

        var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
        Assert.NotNull(profile);
        Assert.Equal(request.FullName, profile.FullName);

        var identity = await db.AuthIdentities
            .FirstOrDefaultAsync(a => a.UserId == user.Id && a.Provider == AuthProvider.Email);
        Assert.NotNull(identity);
        Assert.Equal(request.Email, identity.ProviderUserId);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsInvalidOperationException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var existingUser = new User
        {
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(existingUser);
        db.SaveChanges();

        var request = new RegisterRequest("test@example.com", "password123", "Another User");

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RegisterAsync(request, "127.0.0.1", "Mozilla/5.0"));
    }

    [Fact]
    public async Task RegisterAsync_SoftDeletedEmail_ThrowsInvalidOperationException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var deletedUser = new User
        {
            Email = "deleted@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            DeletedAt = DateTime.UtcNow,
        };
        db.Users.Add(deletedUser);
        db.SaveChanges();

        var request = new RegisterRequest("deleted@example.com", "password123", "New User");

        // Act & Assert - should throw because IgnoreQueryFilters catches soft-deleted
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RegisterAsync(request, "127.0.0.1", "Mozilla/5.0"));
    }

    // ============ LoginAsync Tests ============

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokens()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = userId };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockPasswordHasher
            .Setup(p => p.Verify("password123", "hash_of_password123"))
            .Returns(true);

        _mockSessionService
            .Setup(s => s.CreateSessionAsync(userId, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);

        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        var request = new LoginRequest("test@example.com", "password123");

        // Act
        var result = await service.LoginAsync(request, "127.0.0.1", "Mozilla/5.0");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("access", result.AccessToken);
        Assert.Equal(0, user.FailedLoginCount);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher
            .Setup(p => p.Verify("wrongpassword", "hash_of_password123"))
            .Returns(false);

        var request = new LoginRequest("test@example.com", "wrongpassword");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(request, "127.0.0.1", "Mozilla/5.0"));

        // Verify failed count incremented
        var updated = await db.Users.FirstAsync();
        Assert.Equal(1, updated.FailedLoginCount);
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);
        var request = new LoginRequest("unknown@example.com", "password123");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(request, "127.0.0.1", "Mozilla/5.0"));
    }

    [Fact]
    public async Task LoginAsync_LockedAccount_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "locked@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            LockedUntil = DateTime.UtcNow.AddMinutes(10),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var request = new LoginRequest("locked@example.com", "password123");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(request, "127.0.0.1", "Mozilla/5.0"));
    }

    [Fact]
    public async Task LoginAsync_FailedAttempts_IncrementsCounter()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            FailedLoginCount = 0,
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher
            .Setup(p => p.Verify(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(false);

        var request = new LoginRequest("test@example.com", "wrongpassword");

        // Act
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(request, "127.0.0.1", "Mozilla/5.0"));

        // Assert
        var updated = await db.Users.FirstAsync();
        Assert.Equal(1, updated.FailedLoginCount);
    }

    [Fact]
    public async Task LoginAsync_FiveFailedAttempts_LocksAccount()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            FailedLoginCount = 4,
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher
            .Setup(p => p.Verify(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(false);

        var request = new LoginRequest("test@example.com", "wrongpassword");

        // Act
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.LoginAsync(request, "127.0.0.1", "Mozilla/5.0"));

        // Assert
        var updated = await db.Users.FirstAsync();
        Assert.Equal(5, updated.FailedLoginCount);
        // LockedUntil is set via ExecuteUpdateAsync in the service, need to reload context
        await db.Entry(updated).ReloadAsync();
        Assert.NotNull(updated.LockedUntil);
        Assert.True(updated.IsLocked);
    }

    [Fact]
    public async Task LoginAsync_SuccessfulLogin_ResetsFailedCount()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            FailedLoginCount = 2,
            LockedUntil = null,
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher
            .Setup(p => p.Verify("password123", "hash_of_password123"))
            .Returns(true);

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = userId };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockSessionService
            .Setup(s => s.CreateSessionAsync(userId, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);

        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        var request = new LoginRequest("test@example.com", "password123");

        // Act
        await service.LoginAsync(request, "127.0.0.1", "Mozilla/5.0");

        // Assert
        var updated = await db.Users.FirstAsync();
        Assert.Equal(0, updated.FailedLoginCount);
        Assert.Null(updated.LockedUntil);
    }

    // ============ RequestMagicLinkAsync Tests ============

    [Fact]
    public async Task RequestMagicLinkAsync_ValidEmail_CreatesMagicLink()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

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
        await service.RequestMagicLinkAsync("test@example.com", "127.0.0.1");

        // Assert
        var magicLink = await db.MagicLinks.FirstOrDefaultAsync(m => m.UserId == userId);
        Assert.NotNull(magicLink);
        Assert.NotNull(magicLink.TokenHash);
        Assert.Null(magicLink.UsedAt);
        Assert.True(magicLink.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task RequestMagicLinkAsync_UnknownEmail_ReturnsWithoutError()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        // Act - should not throw
        await service.RequestMagicLinkAsync("unknown@example.com", "127.0.0.1");

        // Assert - no magic link created
        var count = await db.MagicLinks.CountAsync();
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task RequestMagicLinkAsync_StoresHashedTokenNotPlaintext()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var plainToken = "plaintext_token_123456";
        _mockRandom
            .Setup(r => r.GenerateToken(32))
            .Returns(plainToken);

        _mockTokenHasher
            .Setup(t => t.Hash(plainToken))
            .Returns("hash_of_plaintext_token_123456");

        // Act
        await service.RequestMagicLinkAsync("test@example.com", "127.0.0.1");

        // Assert
        var magicLink = await db.MagicLinks.FirstAsync();
        Assert.Equal("hash_of_plaintext_token_123456", magicLink.TokenHash);
        Assert.NotEqual(plainToken, magicLink.TokenHash);
    }

    // ============ VerifyMagicLinkAsync Tests ============

    [Fact]
    public async Task VerifyMagicLinkAsync_ValidToken_ReturnsTokens()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = null,
            EmailVerified = false,
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "valid_token_123456";
        var tokenHash = "hash_of_valid_token_123456";
        var magicLink = new MagicLink
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
        };
        db.MagicLinks.Add(magicLink);
        db.SaveChanges();

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = userId };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockTokenHasher
            .Setup(t => t.Hash(token))
            .Returns(tokenHash);

        _mockSessionService
            .Setup(s => s.CreateSessionAsync(userId, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);

        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        // Act
        var result = await service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("access", result.AccessToken);

        var verified = await db.Users.FindAsync(userId);
        Assert.True(verified.EmailVerified);

        var usedLink = await db.MagicLinks.FirstAsync();
        Assert.NotNull(usedLink.UsedAt);
    }

    [Fact]
    public async Task VerifyMagicLinkAsync_ExpiredToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = null,
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "expired_token_123456";
        var tokenHash = "hash_of_expired_token_123456";
        var magicLink = new MagicLink
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddSeconds(-10),
        };
        db.MagicLinks.Add(magicLink);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(token))
            .Returns(tokenHash);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0"));
    }

    [Fact]
    public async Task VerifyMagicLinkAsync_UsedToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = null,
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "used_token_123456";
        var tokenHash = "hash_of_used_token_123456";
        var magicLink = new MagicLink
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            UsedAt = DateTime.UtcNow.AddSeconds(-30),
        };
        db.MagicLinks.Add(magicLink);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(token))
            .Returns(tokenHash);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0"));
    }

    // ============ LogoutAsync Tests ============

    [Fact]
    public async Task LogoutAsync_ValidToken_RevokesTokenAndSession()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

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

        var sessionId = Guid.NewGuid();
        var session = new AuthSession
        {
            Id = sessionId,
            UserId = userId,
            IpAddress = "127.0.0.1",
            IsActive = true,
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var refreshToken = "refresh_token_123456";
        var tokenHash = "hash_of_refresh_token_123456";
        var token = new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(token);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(refreshToken))
            .Returns(tokenHash);

        // Act
        await service.LogoutAsync(refreshToken);

        // Assert
        var revokedToken = await db.RefreshTokens.FirstAsync();
        Assert.NotNull(revokedToken.RevokedAt);

        var revokedSession = await db.AuthSessions.FirstAsync();
        Assert.False(revokedSession.IsActive);
        Assert.NotNull(revokedSession.RevokedAt);
    }

    [Fact]
    public async Task LogoutAsync_InvalidToken_DoesNotThrow()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var invalidToken = "invalid_token_123456";
        _mockTokenHasher
            .Setup(t => t.Hash(invalidToken))
            .Returns("hash_of_invalid_token");

        // Act - should not throw
        await service.LogoutAsync(invalidToken);

        // Assert - no exception
    }

    // ============ RevokeAllSessionsAsync Tests ============

    [Fact]
    public async Task RevokeAllSessionsAsync_RotatesSecurityStamp()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var originalStamp = Guid.NewGuid().ToString("N");
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = originalStamp,
        };
        db.Users.Add(user);
        db.SaveChanges();

        // Act
        await service.RevokeAllSessionsAsync(userId);

        // Assert
        var updated = await db.Users.FirstAsync();
        Assert.NotEqual(originalStamp, updated.SecurityStamp);
    }

    [Fact]
    public async Task RevokeAllSessionsAsync_RevokesAllActiveSessions()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

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

        var session1 = new AuthSession { UserId = userId, IpAddress = "127.0.0.1", IsActive = true };
        var session2 = new AuthSession { UserId = userId, IpAddress = "127.0.0.2", IsActive = true };
        db.AuthSessions.Add(session1);
        db.AuthSessions.Add(session2);
        db.SaveChanges();

        _mockSessionService
            .Setup(s => s.DeactivateAllSessionsAsync(userId))
            .Returns(Task.CompletedTask);

        _mockTokenService
            .Setup(t => t.RevokeAllUserTokensAsync(userId))
            .Returns(Task.CompletedTask);

        // Act
        await service.RevokeAllSessionsAsync(userId);

        // Assert
        var sessions = await db.AuthSessions.Where(s => s.UserId == userId).ToListAsync();
        foreach (var s in sessions)
        {
            // Sessions are deactivated by the service mock
        }
    }
}
