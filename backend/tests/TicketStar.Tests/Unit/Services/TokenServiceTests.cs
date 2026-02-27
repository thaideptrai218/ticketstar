using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Services;
using TicketStar.Domain.Entities;
using TicketStar.Infrastructure.Data;
using TicketStar.Tests.Helpers;

namespace TicketStar.Tests.Unit.Services;

public class TokenServiceTests
{
    private readonly Mock<ITokenHasher> _mockTokenHasher;
    private readonly Mock<ISecureRandom> _mockRandom;
    private readonly Mock<IConfiguration> _mockConfig;

    public TokenServiceTests()
    {
        _mockTokenHasher = new Mock<ITokenHasher>();
        _mockRandom = new Mock<ISecureRandom>();
        _mockConfig = new Mock<IConfiguration>();

        // Default mock behavior
        _mockTokenHasher
            .Setup(t => t.Hash(It.IsAny<string>()))
            .Returns((string token) => $"hash_of_{token}");

        _mockRandom
            .Setup(r => r.GenerateToken(It.IsAny<int>()))
            .Returns("random_generated_token_123456789");

        // JWT configuration
        _mockConfig
            .Setup(c => c["Jwt:Secret"])
            .Returns("this_is_a_32_character_secret_key_for_testing_only_123456");

        _mockConfig
            .Setup(c => c["Jwt:Issuer"])
            .Returns("TicketStar");

        _mockConfig
            .Setup(c => c["Jwt:Audience"])
            .Returns("TicketStarApp");

        var mockSection = new Mock<IConfigurationSection>();
        mockSection.Setup(s => s.Value).Returns("15");
        _mockConfig
            .Setup(c => c.GetSection("Jwt:ExpiryMinutes"))
            .Returns(mockSection.Object);
    }

    private AppDbContext CreateDbContext()
    {
        var factory = new TestDbContextFactory();
        return factory.CreateDbContext();
    }

    private TokenService CreateTokenService(AppDbContext db)
    {
        return new TokenService(_mockConfig.Object, _mockTokenHasher.Object, _mockRandom.Object, db);
    }

    // ============ GenerateTokenPairAsync Tests ============

    [Fact]
    public async Task GenerateTokenPairAsync_CreatesRefreshTokenInDatabase()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

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
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        // Act
        var result = await service.GenerateTokenPairAsync(user, session);

        // Assert
        Assert.NotNull(result);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.SessionId == sessionId);
        Assert.NotNull(stored);
        Assert.Equal(userId, stored.UserId);
        Assert.NotNull(stored.FamilyId);
    }

    [Fact]
    public async Task GenerateTokenPairAsync_AccessTokenContainsCorrectClaims()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var securityStamp = Guid.NewGuid().ToString("N");
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = securityStamp,
            EmailVerified = true,
            Role = TicketStar.Domain.Enums.UserRole.User,
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession
        {
            Id = sessionId,
            UserId = userId,
            IpAddress = "127.0.0.1",
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        // Act
        var result = await service.GenerateTokenPairAsync(user, session);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadToken(result.AccessToken) as JwtSecurityToken;

        Assert.NotNull(token);
        Assert.Contains(token.Claims, c => c.Type == "sub" && c.Value == userId);
        Assert.Contains(token.Claims, c => c.Type == "email" && c.Value == user.Email);
        // ClaimTypes.Role is used in the service, not just "role"
        Assert.Contains(token.Claims, c => c.Type == System.Security.Claims.ClaimTypes.Role && c.Value == user.Role.ToString());
        Assert.Contains(token.Claims, c => c.Type == "sid" && c.Value == sessionId.ToString("N"));
        Assert.Contains(token.Claims, c => c.Type == "sstamp");
    }

    [Fact]
    public async Task GenerateTokenPairAsync_ReturnsValidSessionId()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

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
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        // Act
        var result = await service.GenerateTokenPairAsync(user, session);

        // Assert
        Assert.Equal(sessionId.ToString("N"), result.SessionId);
    }

    // ============ RefreshTokenAsync Tests ============

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_RotatesAndReturnsNew()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

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

        var familyId = Guid.NewGuid().ToString("N");
        var oldToken = "old_refresh_token_123456";
        var oldTokenHash = "hash_of_old_refresh_token_123456";
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = oldTokenHash,
            FamilyId = familyId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(refreshToken);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(oldToken))
            .Returns(oldTokenHash);

        var newToken = "new_refresh_token_789012";
        _mockRandom
            .Setup(r => r.GenerateToken(64))
            .Returns(newToken);

        // Act
        var result = await service.RefreshTokenAsync(oldToken);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(oldToken, result.RefreshToken);

        var oldStored = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == oldTokenHash);
        Assert.NotNull(oldStored.RevokedAt);

        var newStored = await db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAt == null)
            .FirstOrDefaultAsync();
        Assert.NotNull(newStored);
        Assert.Equal(familyId, newStored.FamilyId);
    }

    [Fact]
    public async Task RefreshTokenAsync_RevokedToken_RevokesEntireFamily()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

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

        var familyId = Guid.NewGuid().ToString("N");
        var revokedToken = "revoked_refresh_token_123456";
        var revokedTokenHash = "hash_of_revoked_refresh_token_123456";

        // Add multiple tokens in same family
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = revokedTokenHash,
            FamilyId = familyId,
            RevokedAt = DateTime.UtcNow.AddSeconds(-30),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = "hash_of_other_token_in_family",
            FamilyId = familyId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(revokedToken))
            .Returns(revokedTokenHash);

        // Act & Assert - should throw due to reuse detection
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.RefreshTokenAsync(revokedToken));

        // Verify entire family is revoked
        var familyTokens = await db.RefreshTokens
            .Where(t => t.FamilyId == familyId)
            .ToListAsync();
        Assert.True(familyTokens.All(t => t.RevokedAt != null));
    }

    [Fact]
    public async Task RefreshTokenAsync_ExpiredToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

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
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var expiredToken = "expired_refresh_token_123456";
        var expiredTokenHash = "hash_of_expired_refresh_token_123456";
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = expiredTokenHash,
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddSeconds(-10),
        };
        db.RefreshTokens.Add(refreshToken);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(expiredToken))
            .Returns(expiredTokenHash);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.RefreshTokenAsync(expiredToken));
    }

    [Fact]
    public async Task RefreshTokenAsync_DeletedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            DeletedAt = DateTime.UtcNow,
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

        var refreshToken = new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = "hash_of_token",
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(refreshToken);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(It.IsAny<string>()))
            .Returns("hash_of_token");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.RefreshTokenAsync("valid_token"));
    }

    [Fact]
    public async Task RefreshTokenAsync_LockedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            LockedUntil = DateTime.UtcNow.AddMinutes(10),
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

        var refreshToken = new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = "hash_of_token",
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(refreshToken);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(It.IsAny<string>()))
            .Returns("hash_of_token");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.RefreshTokenAsync("valid_token"));
    }

    // ============ RevokeRefreshTokenAsync Tests ============

    [Fact]
    public async Task RevokeRefreshTokenAsync_ActiveToken_MarksRevoked()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var token = "refresh_token_to_revoke";
        var tokenHash = "hash_of_refresh_token_to_revoke";

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
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var refreshToken = new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(refreshToken);
        db.SaveChanges();

        _mockTokenHasher
            .Setup(t => t.Hash(token))
            .Returns(tokenHash);

        // Act
        await service.RevokeRefreshTokenAsync(token);

        // Assert
        var revoked = await db.RefreshTokens.FirstAsync();
        Assert.NotNull(revoked.RevokedAt);
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_AlreadyRevokedToken_DoesNothing()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var tokenHash = "hash_of_already_revoked_token";

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
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var refreshToken = new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddSeconds(-30),
        };
        db.RefreshTokens.Add(refreshToken);
        db.SaveChanges();

        var revokedAtBefore = refreshToken.RevokedAt;

        _mockTokenHasher
            .Setup(t => t.Hash(It.IsAny<string>()))
            .Returns(tokenHash);

        // Act - should not throw and should not update RevokedAt
        await service.RevokeRefreshTokenAsync("some_token");

        // Assert
        var stored = await db.RefreshTokens.FirstAsync();
        Assert.Equal(revokedAtBefore, stored.RevokedAt);
    }

    // ============ RevokeAllUserTokensAsync Tests ============

    [Fact]
    public async Task RevokeAllUserTokensAsync_RevokesAllActiveTokens()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

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
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        // Add multiple active tokens
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = "hash1",
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = "hash2",
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        // Act
        await service.RevokeAllUserTokensAsync(userId);

        // Assert
        var tokens = await db.RefreshTokens
            .Where(t => t.UserId == userId)
            .ToListAsync();
        Assert.True(tokens.All(t => t.RevokedAt != null));
    }

    [Fact]
    public async Task RevokeAllUserTokensAsync_OnlyRevokesActiveTokens()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

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
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var alreadyRevokedAt = DateTime.UtcNow.AddMinutes(-5);

        // Add active and revoked tokens
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = "hash_active",
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            SessionId = sessionId,
            TokenHash = "hash_already_revoked",
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = alreadyRevokedAt,
        });
        db.SaveChanges();

        // Act
        await service.RevokeAllUserTokensAsync(userId);

        // Assert
        var activeToken = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == "hash_active");
        Assert.NotNull(activeToken.RevokedAt);

        var alreadyRevoked = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == "hash_already_revoked");
        Assert.Equal(alreadyRevokedAt, alreadyRevoked.RevokedAt);
    }
}
