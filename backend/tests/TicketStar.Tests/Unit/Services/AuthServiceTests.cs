using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Application.Services;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Infrastructure.Data;
using TicketStar.Infrastructure.Repositories;
using TicketStar.Tests.Helpers;

namespace TicketStar.Tests.Unit.Services;

public class AuthServiceTests
{
    private readonly Mock<IPasswordHasher> _mockPasswordHasher;
    private readonly Mock<ITokenHasher> _mockTokenHasher;
    private readonly Mock<ISecureRandom> _mockRandom;
    private readonly Mock<ITokenService> _mockTokenService;
    private readonly Mock<ISessionService> _mockSessionService;
    private readonly Mock<ITokenBlacklist> _mockTokenBlacklist;
    private readonly Mock<IMfaService> _mockMfaService;
    private readonly Mock<ICollaboratorService> _mockCollaboratorService;
    private readonly IOptions<GoogleAuthOptions> _googleOptions;
    private readonly IOptions<JwtOptions> _jwtOptions;
    private readonly Mock<ILogger<AuthService>> _mockLogger;

    public AuthServiceTests()
    {
        _mockPasswordHasher = new Mock<IPasswordHasher>();
        _mockTokenHasher = new Mock<ITokenHasher>();
        _mockRandom = new Mock<ISecureRandom>();
        _mockTokenService = new Mock<ITokenService>();
        _mockSessionService = new Mock<ISessionService>();
        _mockTokenBlacklist = new Mock<ITokenBlacklist>();
        _mockMfaService = new Mock<IMfaService>();
        _mockCollaboratorService = new Mock<ICollaboratorService>();
        _googleOptions = Options.Create(new GoogleAuthOptions { ClientId = "test-client-id" });
        _jwtOptions = Options.Create(new JwtOptions
        {
            Secret = "test_secret_key_for_testing_only_123456",
            Issuer = "TicketStar",
            Audience = "TicketStarApp",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7,
        });
        _mockLogger = new Mock<ILogger<AuthService>>();

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
    }

    private AppDbContext CreateDbContext()
    {
        var factory = new TestDbContextFactory();
        return factory.CreateDbContext();
    }

    private AuthService CreateAuthService(AppDbContext db)
    {
        return new AuthService(
            new UserRepository(db),
            new AuthIdentityRepository(db),
            new MagicLinkRepository(db),
            new RefreshTokenRepository(db),
            new SecurityEventRepository(db),
            new EfUnitOfWork(db),
            _mockPasswordHasher.Object,
            _mockTokenHasher.Object,
            _mockRandom.Object,
            _mockTokenService.Object,
            _mockSessionService.Object,
            _mockTokenBlacklist.Object,
            _mockMfaService.Object,
            _mockCollaboratorService.Object,
            _googleOptions,
            _jwtOptions,
            _mockLogger.Object);
    }

    // ============ RegisterAsync Tests ============

    [Fact]
    public async Task RegisterAsync_ValidInput_CreatesUserAndProfile()
    {
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

        var result = await service.RegisterAsync(request, "127.0.0.1", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
        Assert.Equal("access", result.Value!.AccessToken);

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
    public async Task RegisterAsync_DuplicateEmail_ReturnsConflict()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var existingUser = new User
        {
            Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(existingUser);
        db.SaveChanges();

        var request = new RegisterRequest("test@example.com", "password123", "Another User");

        var result = await service.RegisterAsync(request, "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Conflict, result.ErrorType);
    }

    [Fact]
    public async Task RegisterAsync_SoftDeletedEmail_ReturnsConflict()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var deletedUser = new User
        {
            Email = "deleted@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"), DeletedAt = DateTime.UtcNow,
        };
        db.Users.Add(deletedUser);
        db.SaveChanges();

        var request = new RegisterRequest("deleted@example.com", "password123", "New User");

        var result = await service.RegisterAsync(request, "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Conflict, result.ErrorType);
    }

    // ============ LoginAsync Tests ============

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokens()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = userId };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockPasswordHasher.Setup(p => p.Verify("password123", "hash_of_password123")).Returns(true);
        _mockSessionService
            .Setup(s => s.CreateSessionAsync(userId, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);
        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        var result = await service.LoginAsync(new LoginRequest("test@example.com", "password123"), "127.0.0.1", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
        Assert.Equal("access", result.Value!.Tokens!.AccessToken);
        Assert.Equal(0, user.FailedLoginCount);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ReturnsUnauthorized()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com", PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher.Setup(p => p.Verify("wrongpassword", "hash_of_password123")).Returns(false);

        var result = await service.LoginAsync(new LoginRequest("test@example.com", "wrongpassword"), "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);

        // Verify failed count incremented
        var updated = await db.Users.IgnoreQueryFilters().FirstAsync();
        Assert.Equal(1, updated.FailedLoginCount);
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ReturnsUnauthorized()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var result = await service.LoginAsync(new LoginRequest("unknown@example.com", "password123"), "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    [Fact]
    public async Task LoginAsync_LockedAccount_ReturnsUnauthorized()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "locked@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"), LockedUntil = DateTime.UtcNow.AddMinutes(10),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var result = await service.LoginAsync(new LoginRequest("locked@example.com", "password123"), "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    [Fact]
    public async Task LoginAsync_FailedAttempts_IncrementsCounter()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com", PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"), FailedLoginCount = 0,
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher.Setup(p => p.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);

        var result = await service.LoginAsync(new LoginRequest("test@example.com", "wrongpassword"), "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        var updated = await db.Users.IgnoreQueryFilters().FirstAsync();
        Assert.Equal(1, updated.FailedLoginCount);
    }

    [Fact]
    public async Task LoginAsync_FiveFailedAttempts_LocksAccount()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com", PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"), FailedLoginCount = 4,
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher.Setup(p => p.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(false);

        var result = await service.LoginAsync(new LoginRequest("test@example.com", "wrongpassword"), "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        var updated = await db.Users.IgnoreQueryFilters().FirstAsync();
        Assert.Equal(5, updated.FailedLoginCount);
        await db.Entry(updated).ReloadAsync();
        Assert.NotNull(updated.LockedUntil);
        Assert.True(updated.IsLocked);
    }

    [Fact]
    public async Task LoginAsync_SuccessfulLogin_ResetsFailedCount()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"), FailedLoginCount = 2, LockedUntil = null,
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher.Setup(p => p.Verify("password123", "hash_of_password123")).Returns(true);

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = userId };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockSessionService
            .Setup(s => s.CreateSessionAsync(userId, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);
        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        await service.LoginAsync(new LoginRequest("test@example.com", "password123"), "127.0.0.1", "Mozilla/5.0");

        var updated = await db.Users.FirstAsync();
        Assert.Equal(0, updated.FailedLoginCount);
        Assert.Null(updated.LockedUntil);
    }

    // ============ RequestMagicLinkAsync Tests ============

    [Fact]
    public async Task RequestMagicLinkAsync_ValidEmail_CreatesMagicLink()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var result = await service.RequestMagicLinkAsync("test@example.com", "127.0.0.1");

        Assert.True(result.IsSuccess);
        var magicLink = await db.MagicLinks.FirstOrDefaultAsync(m => m.UserId == userId);
        Assert.NotNull(magicLink);
        Assert.NotNull(magicLink.TokenHash);
        Assert.Null(magicLink.UsedAt);
        Assert.True(magicLink.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task RequestMagicLinkAsync_UnknownEmail_ReturnsSuccessWithoutError()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var result = await service.RequestMagicLinkAsync("unknown@example.com", "127.0.0.1");

        Assert.True(result.IsSuccess);
        var count = await db.MagicLinks.CountAsync();
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task RequestMagicLinkAsync_StoresHashedTokenNotPlaintext()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var user = new User
        {
            Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var plainToken = "plaintext_token_123456";
        _mockRandom.Setup(r => r.GenerateToken(32)).Returns(plainToken);
        _mockTokenHasher.Setup(t => t.Hash(plainToken)).Returns("hash_of_plaintext_token_123456");

        await service.RequestMagicLinkAsync("test@example.com", "127.0.0.1");

        var magicLink = await db.MagicLinks.FirstAsync();
        Assert.Equal("hash_of_plaintext_token_123456", magicLink.TokenHash);
        Assert.NotEqual(plainToken, magicLink.TokenHash);
    }

    // ============ VerifyMagicLinkAsync Tests ============

    [Fact]
    public async Task VerifyMagicLinkAsync_ValidToken_ReturnsTokens()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = null,
            EmailVerified = false, SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "valid_token_123456";
        var tokenHash = "hash_of_valid_token_123456";
        var magicLink = new MagicLink
        {
            UserId = userId, TokenHash = tokenHash, ExpiresAt = DateTime.UtcNow.AddMinutes(5),
        };
        db.MagicLinks.Add(magicLink);
        db.SaveChanges();

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = userId };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockTokenHasher.Setup(t => t.Hash(token)).Returns(tokenHash);
        _mockSessionService
            .Setup(s => s.CreateSessionAsync(userId, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);
        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        var result = await service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
        Assert.Equal("access", result.Value!.Tokens!.AccessToken);

        var verified = await db.Users.FindAsync(userId);
        Assert.True(verified!.EmailVerified);

        var usedLink = await db.MagicLinks.FirstAsync();
        Assert.NotNull(usedLink.UsedAt);
    }

    [Fact]
    public async Task VerifyMagicLinkAsync_ExpiredToken_ReturnsUnauthorized()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = null,
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "expired_token_123456";
        var tokenHash = "hash_of_expired_token_123456";
        db.MagicLinks.Add(new MagicLink
        {
            UserId = userId, TokenHash = tokenHash, ExpiresAt = DateTime.UtcNow.AddSeconds(-10),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(token)).Returns(tokenHash);

        var result = await service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    [Fact]
    public async Task VerifyMagicLinkAsync_UsedToken_ReturnsUnauthorized()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = null,
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "used_token_123456";
        var tokenHash = "hash_of_used_token_123456";
        db.MagicLinks.Add(new MagicLink
        {
            UserId = userId, TokenHash = tokenHash, ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            UsedAt = DateTime.UtcNow.AddSeconds(-30),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(token)).Returns(tokenHash);

        var result = await service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    // ============ LogoutAsync Tests ============

    [Fact]
    public async Task LogoutAsync_ValidToken_RevokesTokenAndSession()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession
        {
            Id = sessionId, UserId = userId, IpAddress = "127.0.0.1", IsActive = true,
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var refreshToken = "refresh_token_123456";
        var tokenHash = "hash_of_refresh_token_123456";
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(refreshToken)).Returns(tokenHash);
        _mockSessionService
            .Setup(s => s.GetSessionAsync(sessionId))
            .ReturnsAsync(session);

        var result = await service.LogoutAsync(refreshToken);

        Assert.True(result.IsSuccess);
        var revokedToken = await db.RefreshTokens.FirstAsync();
        Assert.NotNull(revokedToken.RevokedAt);
    }

    [Fact]
    public async Task LogoutAsync_InvalidToken_ReturnsSuccess()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var invalidToken = "invalid_token_123456";
        _mockTokenHasher.Setup(t => t.Hash(invalidToken)).Returns("hash_of_invalid_token");

        var result = await service.LogoutAsync(invalidToken);

        Assert.True(result.IsSuccess);
    }

    // ============ RevokeAllSessionsAsync Tests ============

    [Fact]
    public async Task RevokeAllSessionsAsync_RotatesSecurityStamp()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var originalStamp = Guid.NewGuid().ToString("N");
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = originalStamp,
        };
        db.Users.Add(user);
        db.SaveChanges();

        var result = await service.RevokeAllSessionsAsync(userId);

        Assert.True(result.IsSuccess);
        var updated = await db.Users.FirstAsync();
        Assert.NotEqual(originalStamp, updated.SecurityStamp);
    }

    [Fact]
    public async Task RevokeAllSessionsAsync_CallsTokenAndSessionRevocation()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockSessionService
            .Setup(s => s.DeactivateAllSessionsAsync(userId))
            .Returns(Task.CompletedTask);
        _mockTokenService
            .Setup(t => t.RevokeAllUserTokensAsync(userId))
            .Returns(Task.CompletedTask);

        var result = await service.RevokeAllSessionsAsync(userId);

        Assert.True(result.IsSuccess);
        _mockTokenService.Verify(t => t.RevokeAllUserTokensAsync(userId), Times.Once);
        _mockSessionService.Verify(s => s.DeactivateAllSessionsAsync(userId), Times.Once);
    }

    [Fact]
    public async Task RevokeAllSessionsAsync_BlacklistsUserTokens()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockSessionService
            .Setup(s => s.DeactivateAllSessionsAsync(userId))
            .Returns(Task.CompletedTask);
        _mockTokenService
            .Setup(t => t.RevokeAllUserTokensAsync(userId))
            .Returns(Task.CompletedTask);

        var result = await service.RevokeAllSessionsAsync(userId);

        Assert.True(result.IsSuccess);
        _mockTokenBlacklist.Verify(
            t => t.BlacklistUserAsync(userId, It.IsAny<TimeSpan>()),
            Times.Once);
    }

    // ============ GoogleLoginAsync Tests ============

    [Fact]
    public void GoogleLoginAsync_DocumentsExternalDependency()
    {
        // Note: GoogleJsonWebSignature.ValidateAsync is not mocked (external lib),
        // so full unit testing of GoogleLoginAsync requires test fixtures or integration tests.
        // Coverage for GoogleLoginAsync requires mocking the Google API client library.
        // This is documented for future implementation when Google Auth mocking strategy is finalized.
    }

    // ============ MFA Tests ============

    [Fact]
    public async Task LoginAsync_MfaEnabled_ReturnsMfaChallenge()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash_of_password123",
            SecurityStamp = Guid.NewGuid().ToString("N"), MfaEnabled = true,
        };
        db.Users.Add(user);
        db.SaveChanges();

        _mockPasswordHasher.Setup(p => p.Verify("password123", "hash_of_password123")).Returns(true);
        _mockMfaService.Setup(m => m.GenerateMfaToken(userId)).Returns("mfa_token_123");

        var result = await service.LoginAsync(new LoginRequest("test@example.com", "password123"), "127.0.0.1", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.RequiresMfa);
        Assert.NotNull(result.Value!.MfaChallenge);
        Assert.Equal("mfa_token_123", result.Value!.MfaChallenge!.MfaToken);
        Assert.Null(result.Value!.Tokens);
    }

    [Fact]
    public async Task VerifyMagicLinkAsync_MfaEnabled_ReturnsMfaChallenge()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = null,
            EmailVerified = false, SecurityStamp = Guid.NewGuid().ToString("N"), MfaEnabled = true,
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "valid_token_123456";
        var tokenHash = "hash_of_valid_token_123456";
        var magicLink = new MagicLink
        {
            UserId = userId, TokenHash = tokenHash, ExpiresAt = DateTime.UtcNow.AddMinutes(5),
        };
        db.MagicLinks.Add(magicLink);
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(token)).Returns(tokenHash);
        _mockMfaService.Setup(m => m.GenerateMfaToken(userId)).Returns("mfa_token_456");

        var result = await service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
        Assert.True(result.Value!.RequiresMfa);
        Assert.NotNull(result.Value!.MfaChallenge);
        Assert.Equal("mfa_token_456", result.Value!.MfaChallenge!.MfaToken);
        Assert.Null(result.Value!.Tokens);
    }

    [Fact]
    public async Task VerifyMagicLinkAsync_AlreadyVerified_DoesNotUpdateEmailVerified()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = null,
            EmailVerified = true, SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "valid_token_123456";
        var tokenHash = "hash_of_valid_token_123456";
        var magicLink = new MagicLink
        {
            UserId = userId, TokenHash = tokenHash, ExpiresAt = DateTime.UtcNow.AddMinutes(5),
        };
        db.MagicLinks.Add(magicLink);
        db.SaveChanges();

        var mockSession = new AuthSession { Id = Guid.NewGuid(), UserId = userId };
        var mockTokens = new TokenResponse("access", "refresh", DateTime.UtcNow.AddMinutes(15), "sid");

        _mockTokenHasher.Setup(t => t.Hash(token)).Returns(tokenHash);
        _mockSessionService
            .Setup(s => s.CreateSessionAsync(userId, It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(mockSession);
        _mockTokenService
            .Setup(t => t.GenerateTokenPairAsync(It.IsAny<User>(), It.IsAny<AuthSession>()))
            .ReturnsAsync(mockTokens);

        var result = await service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0");

        Assert.True(result.IsSuccess);
        var verified = await db.Users.FindAsync(userId);
        Assert.True(verified!.EmailVerified);
    }

    [Fact]
    public async Task VerifyMagicLinkAsync_AlreadyUsedToken_ReturnsUnauthorized()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = null,
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var token = "used_token_123456";
        var tokenHash = "hash_of_used_token_123456";
        db.MagicLinks.Add(new MagicLink
        {
            UserId = userId, TokenHash = tokenHash, ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            UsedAt = DateTime.UtcNow.AddSeconds(-30),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(token)).Returns(tokenHash);

        var result = await service.VerifyMagicLinkAsync(token, "127.0.0.1", "Mozilla/5.0");

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultError.Unauthorized, result.ErrorType);
    }

    [Fact]
    public async Task LogoutAsync_WithTransaction_RevokesTokenAndSession()
    {
        using var db = CreateDbContext();
        var service = CreateAuthService(db);

        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId, Email = "test@example.com", PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var sessionId = Guid.NewGuid();
        var session = new AuthSession
        {
            Id = sessionId, UserId = userId, IpAddress = "127.0.0.1", IsActive = true,
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var refreshToken = "refresh_token_123456";
        var tokenHash = "hash_of_refresh_token_123456";
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId, SessionId = sessionId, TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"), ExpiresAt = DateTime.UtcNow.AddDays(7),
        });
        db.SaveChanges();

        _mockTokenHasher.Setup(t => t.Hash(refreshToken)).Returns(tokenHash);
        _mockSessionService
            .Setup(s => s.GetSessionAsync(sessionId))
            .ReturnsAsync(session);

        var result = await service.LogoutAsync(refreshToken);

        Assert.True(result.IsSuccess);
        var revokedToken = await db.RefreshTokens.FirstAsync();
        Assert.NotNull(revokedToken.RevokedAt);
        var revokedSession = await db.AuthSessions.FirstAsync();
        Assert.False(revokedSession.IsActive);
        Assert.NotNull(revokedSession.RevokedAt);
    }
}
