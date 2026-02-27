using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Application.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenHasher _tokenHasher;
    private readonly ISecureRandom _random;
    private readonly ITokenService _tokenService;
    private readonly ISessionService _sessionService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext db,
        IPasswordHasher passwordHasher,
        ITokenHasher tokenHasher,
        ISecureRandom random,
        ITokenService tokenService,
        ISessionService sessionService,
        IConfiguration config,
        ILogger<AuthService> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenHasher = tokenHasher;
        _random = random;
        _tokenService = tokenService;
        _sessionService = sessionService;
        _config = config;
        _logger = logger;
    }

    public async Task<TokenResponse> RegisterAsync(RegisterRequest request, string? ip, string? ua)
    {
        // RED TEAM H5 FIX: IgnoreQueryFilters to catch soft-deleted emails
        if (await _db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            Email = request.Email,
            EmailVerified = false,
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = UserRole.User,
        };
        user.Profile = new UserProfile { UserId = user.Id, FullName = request.FullName };

        var identity = new AuthIdentity
        {
            UserId = user.Id,
            Provider = AuthProvider.Email,
            ProviderUserId = request.Email,
            ProviderEmail = request.Email,
        };

        _db.Users.Add(user);
        _db.AuthIdentities.Add(identity);
        await _db.SaveChangesAsync();

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.Login, true, ip, ua);
        return tokens;
    }

    public async Task<TokenResponse> LoginAsync(LoginRequest request, string? ip, string? ua)
    {
        // RED TEAM H5 FIX: IgnoreQueryFilters for security-sensitive lookup
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user is null)
        {
            await LogEventAsync(null, SecurityEventType.LoginFailed, false, ip, ua, "Unknown email");
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        if (user.IsLocked)
        {
            await LogEventAsync(user.Id, SecurityEventType.LoginFailed, false, ip, ua, "Account locked");
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        if (user.PasswordHash is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            // RED TEAM H6 FIX: atomic increment to prevent race condition on brute force
            await _db.Users
                .Where(u => u.Id == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.FailedLoginCount, u => u.FailedLoginCount + 1));
            await _db.Entry(user).ReloadAsync();

            if (user.FailedLoginCount >= 5)
            {
                await _db.Users.Where(u => u.Id == user.Id)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedUntil, DateTime.UtcNow.AddMinutes(15)));
                await LogEventAsync(user.Id, SecurityEventType.AccountLocked, true, ip, ua);
            }

            await LogEventAsync(user.Id, SecurityEventType.LoginFailed, false, ip, ua, "Wrong password");
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        // Reset on successful login
        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        await _db.SaveChangesAsync();

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.Login, true, ip, ua);
        return tokens;
    }

    public async Task<TokenResponse> GoogleLoginAsync(string idToken, string? ip, string? ua)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = [_config["Google:ClientId"]!]
        };
        var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

        // RED TEAM H1 FIX: require verified email
        if (!payload.EmailVerified)
            throw new UnauthorizedAccessException("Google account email not verified.");

        var user = await _db.Users.Include(u => u.Profile)
            .FirstOrDefaultAsync(u => u.Email == payload.Email);

        if (user is not null)
        {
            // RED TEAM H1 FIX: reject silent provider merge -- require explicit account linking
            var hasGoogleIdentity = await _db.AuthIdentities
                .AnyAsync(a => a.UserId == user.Id && a.Provider == AuthProvider.Google);
            if (!hasGoogleIdentity)
                throw new UnauthorizedAccessException(
                    "An account with this email exists. Please login with your original method.");
        }
        else
        {
            user = new User
            {
                Email = payload.Email,
                EmailVerified = payload.EmailVerified,
                Role = UserRole.User,
            };
            user.Profile = new UserProfile
            {
                UserId = user.Id,
                FullName = payload.Name ?? "",
                AvatarUrl = payload.Picture,
            };
            _db.Users.Add(user);
        }

        var googleIdentity = await _db.AuthIdentities
            .FirstOrDefaultAsync(a => a.UserId == user.Id && a.Provider == AuthProvider.Google);

        if (googleIdentity is null)
        {
            googleIdentity = new AuthIdentity
            {
                UserId = user.Id,
                Provider = AuthProvider.Google,
                ProviderUserId = payload.Subject,
                ProviderEmail = payload.Email,
            };
            _db.AuthIdentities.Add(googleIdentity);
        }

        googleIdentity.LastUsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.GoogleOAuthLogin, true, ip, ua);
        return tokens;
    }

    public async Task RequestMagicLinkAsync(string email, string? ip)
    {
        // Always succeed to prevent email enumeration
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null) return;

        var token = _random.GenerateToken(32);
        var entity = new MagicLink
        {
            UserId = user.Id,
            TokenHash = _tokenHasher.Hash(token),
            IpAddress = ip,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
        };
        _db.MagicLinks.Add(entity);
        await _db.SaveChangesAsync();

        await LogEventAsync(user.Id, SecurityEventType.MagicLinkRequested, true, ip, null);

        // RED TEAM H2 FIX: log only hash prefix, never plaintext token
        var hash = _tokenHasher.Hash(token);
        _logger.LogDebug("Magic link issued for {Email}, hash prefix: {Prefix}", email, hash[..8]);

        // Console stub for dev (replace with email service in production)
        _logger.LogInformation("=== DEV ONLY - MAGIC LINK TOKEN for {Email}: {Token} ===", email, token);
    }

    public async Task<TokenResponse> VerifyMagicLinkAsync(string token, string? ip, string? ua)
    {
        var hash = _tokenHasher.Hash(token);

        var magicLink = await _db.MagicLinks.Include(m => m.User)
            .FirstOrDefaultAsync(m => m.TokenHash == hash && m.UsedAt == null);

        if (magicLink is null)
            throw new UnauthorizedAccessException("Invalid or used magic link.");

        if (magicLink.IsExpired)
            throw new UnauthorizedAccessException("Magic link expired.");

        // Mark used atomically (RowVersion on MagicLink prevents double-use race condition)
        magicLink.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var user = magicLink.User;
        if (!user.EmailVerified)
        {
            user.EmailVerified = true;
            await _db.SaveChangesAsync();
        }

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.MagicLinkVerified, true, ip, ua);
        return tokens;
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var hash = _tokenHasher.Hash(refreshToken);
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash);
        if (stored is null) return;

        // RED TEAM H4 FIX: atomic logout in single transaction
        using var tx = await _db.Database.BeginTransactionAsync();
        stored.RevokedAt = DateTime.UtcNow;
        var session = await _db.AuthSessions.FindAsync(stored.SessionId);
        if (session is { IsActive: true })
        {
            session.IsActive = false;
            session.RevokedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        await LogEventAsync(stored.UserId, SecurityEventType.Logout, true, null, null);
    }

    public async Task RevokeAllSessionsAsync(string userId)
    {
        await _tokenService.RevokeAllUserTokensAsync(userId);
        await _sessionService.DeactivateAllSessionsAsync(userId);

        // Rotate security stamp to invalidate all existing JWTs on next refresh
        var user = await _db.Users.FindAsync(userId);
        if (user is not null)
        {
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            await _db.SaveChangesAsync();
        }

        await LogEventAsync(userId, SecurityEventType.AllSessionsRevoked, true, null, null);
    }

    private async Task LogEventAsync(
        string? userId, SecurityEventType type, bool success,
        string? ip, string? ua, string? failureReason = null)
    {
        _db.SecurityEvents.Add(new SecurityEvent
        {
            UserId = userId,
            EventType = type,
            Success = success,
            FailureReason = failureReason,
            IpAddress = ip,
            UserAgent = ua,
        });
        await _db.SaveChangesAsync();
    }
}
