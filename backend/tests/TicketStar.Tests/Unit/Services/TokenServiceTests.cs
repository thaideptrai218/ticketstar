using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Application.Services;
using TicketStar.Domain.Entities;
using TicketStar.Infrastructure.Data;
using TicketStar.Infrastructure.Repositories;
using TicketStar.Tests.Helpers;

namespace TicketStar.Tests.Unit.Services;

public class TokenServiceTests
{
    private readonly Mock<ITokenHasher> _mockTokenHasher;
    private readonly Mock<ISecureRandom> _mockRandom;
    private readonly IOptions<JwtOptions> _jwtOptions;

    public TokenServiceTests()
    {
        _mockTokenHasher = new Mock<ITokenHasher>();
        _mockRandom = new Mock<ISecureRandom>();

        _mockTokenHasher
            .Setup(t => t.Hash(It.IsAny<string>()))
            .Returns((string token) => $"hash_of_{token}");

        _mockRandom
            .Setup(r => r.GenerateToken(It.IsAny<int>()))
            .Returns("random_generated_token_123456789");

        _jwtOptions = Options.Create(new JwtOptions
        {
            Secret = "this_is_a_32_character_secret_key_for_testing_only_123456",
            Issuer = "TicketStar",
            Audience = "TicketStarApp",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7,
        });
    }

    private AppDbContext CreateDbContext()
    {
        var factory = new TestDbContextFactory();
        return factory.CreateDbContext();
    }

    private TokenService CreateTokenService(AppDbContext db)
    {
        var refreshTokenRepo = new RefreshTokenRepository(db);
        var uow = new EfUnitOfWork(db);
        return new TokenService(_jwtOptions, _mockTokenHasher.Object, _mockRandom.Object, refreshTokenRepo, uow);
    }

    // ============ GenerateTokenPairAsync Tests ============

    [Fact]
    public async Task GenerateTokenPairAsync_CreatesRefreshTokenInDatabase()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var result = await service.GenerateTokenPairAsync(user, session);

        Assert.NotNull(result);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.SessionId == sessionId);
        Assert.NotNull(stored);
        Assert.Equal(userId, stored.UserId);
        Assert.NotNull(stored.FamilyId);
    }

    [Fact]
    public async Task GenerateTokenPairAsync_AccessTokenContainsCorrectClaims()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var securityStamp = Guid.NewGuid().ToString("N");
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = securityStamp, EmailVerified = true,
            Role = TicketStar.Domain.Enums.UserRole.User,
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var result = await service.GenerateTokenPairAsync(user, session);

        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadToken(result.AccessToken) as JwtSecurityToken;

        Assert.NotNull(token);
        Assert.Contains(token.Claims, c => c.Type == "sub" && c.Value == userId);
        Assert.Contains(token.Claims, c => c.Type == "email" && c.Value == user.Email);
        Assert.Contains(token.Claims, c => c.Type == System.Security.Claims.ClaimTypes.Role && c.Value == user.Role.ToString());
        Assert.Contains(token.Claims, c => c.Type == "sid" && c.Value == sessionId.ToString("N"));
        Assert.Contains(token.Claims, c => c.Type == "sstamp");
    }

    [Fact]
    public async Task GenerateTokenPairAsync_ReturnsValidSessionId()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var result = await service.GenerateTokenPairAsync(user, session);

        Assert.Equal(sessionId.ToString("N"), result.SessionId);
    }

    // ============ RefreshTokenAsync Tests ============

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_RotatesAndReturnsNew()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1", IsActive = true };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var familyId = Guid.NewGuid().ToString("N");
        var oldToken = "old_refresh_token_123456";
        var oldTokenHash = "hash_of_old_refresh_token_123456";
        var refreshToken = new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = oldTokenHash,
            FamilyId = familyId, ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(refreshToken);
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(oldToken)).Returns(oldTokenHash);
        var newToken = "new_refresh_token_789012";
        _mockRandom.Setup(r => r.GenerateToken(64)).Returns(newToken);

        var result = await service.RefreshTokenAsync(oldToken);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(oldToken, result.Value!.RefreshToken);

        var oldStored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == oldTokenHash);
        Assert.NotNull(oldStored!.RevokedAt);

        var newStored = await db.RefreshTokens
            .Where(t => t.FamilyId == familyId && t.RevokedAt == null)
            .FirstOrDefaultAsync();
        Assert.NotNull(newStored);
        Assert.Equal(familyId, newStored.FamilyId);
    }

    [Fact]
    public async Task RefreshTokenAsync_RevokedToken_RevokesEntireFamily()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1", IsActive = true };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var familyId = Guid.NewGuid().ToString("N");
        var revokedToken = "revoked_refresh_token_123456";
        var revokedTokenHash = "hash_of_revoked_refresh_token_123456";

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = revokedTokenHash,
            FamilyId = familyId, RevokedAt = DateTime.UtcNow.AddSeconds(-30),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = "hash_of_other_token_in_family",
            FamilyId = familyId, ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(revokedToken)).Returns(revokedTokenHash);

        var result = await service.RefreshTokenAsync(revokedToken);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
        Assert.Contains("reuse", result.Error!, StringComparison.OrdinalIgnoreCase);

        var familyTokens = await db.RefreshTokens.Where(t => t.FamilyId == familyId).ToListAsync();
        Assert.True(familyTokens.All(t => t.RevokedAt != null));
    }

    [Fact]
    public async Task RefreshTokenAsync_ExpiredToken_ReturnsFailure()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var expiredToken = "expired_refresh_token_123456";
        var expiredTokenHash = "hash_of_expired_refresh_token_123456";
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = expiredTokenHash,
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddSeconds(-10),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(expiredToken)).Returns(expiredTokenHash);

        var result = await service.RefreshTokenAsync(expiredToken);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    [Fact]
    public async Task RefreshTokenAsync_DeletedUser_ReturnsFailure()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"), DeletedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1", IsActive = true };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = "hash_of_token",
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(It.IsAny<string>())).Returns("hash_of_token");

        var result = await service.RefreshTokenAsync("valid_token");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    [Fact]
    public async Task RefreshTokenAsync_LockedUser_ReturnsFailure()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"), LockedUntil = DateTime.UtcNow.AddMinutes(10),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1", IsActive = true };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = "hash_of_token",
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(It.IsAny<string>())).Returns("hash_of_token");

        var result = await service.RefreshTokenAsync("valid_token");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    // ============ RevokeRefreshTokenAsync Tests ============

    [Fact]
    public async Task RevokeRefreshTokenAsync_ActiveToken_MarksRevoked()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var token = "refresh_token_to_revoke";
        var tokenHash = "hash_of_refresh_token_to_revoke";

        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(token)).Returns(tokenHash);

        await service.RevokeRefreshTokenAsync(token);

        var revoked = await db.RefreshTokens.FirstAsync();
        Assert.NotNull(revoked.RevokedAt);
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_AlreadyRevokedToken_DoesNothing()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var tokenHash = "hash_of_already_revoked_token";

        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var revokedAt = DateTime.UtcNow.AddSeconds(-30);
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = revokedAt,
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(It.IsAny<string>())).Returns(tokenHash);

        await service.RevokeRefreshTokenAsync("some_token");

        var stored = await db.RefreshTokens.FirstAsync();
        Assert.Equal(revokedAt, stored.RevokedAt);
    }

    // ============ RevokeAllUserTokensAsync Tests ============

    [Fact]
    public async Task RevokeAllUserTokensAsync_RevokesAllActiveTokens()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = "hash1",
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = "hash2",
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        await service.RevokeAllUserTokensAsync(userId);

        var tokens = await db.RefreshTokens.Where(t => t.UserId == userId).ToListAsync();
        Assert.True(tokens.All(t => t.RevokedAt != null));
    }

    [Fact]
    public async Task RevokeAllUserTokensAsync_OnlyRevokesActiveTokens()
    {
        using var db = CreateDbContext();
        var service = CreateTokenService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession { Id = sessionId, UserId = userId, IpAddress = "127.0.0.1" };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var alreadyRevokedAt = DateTime.UtcNow.AddMinutes(-5);
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = "hash_active",
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = "hash_already_revoked",
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = alreadyRevokedAt,
        });
        db.SaveChanges();

        await service.RevokeAllUserTokensAsync(userId);

        var activeToken = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == "hash_active");
        Assert.NotNull(activeToken!.RevokedAt);

        var alreadyRevoked = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == "hash_already_revoked");
        Assert.Equal(alreadyRevokedAt, alreadyRevoked!.RevokedAt);
    }
}
