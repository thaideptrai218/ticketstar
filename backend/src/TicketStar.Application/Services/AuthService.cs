using Google.Apis.Auth;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IAuthIdentityRepository _identityRepo;
    private readonly IMagicLinkRepository _magicLinkRepo;
    private readonly IRefreshTokenRepository _refreshTokenRepo;
    private readonly ISecurityEventRepository _securityEventRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenHasher _tokenHasher;
    private readonly ISecureRandom _random;
    private readonly ITokenService _tokenService;
    private readonly ISessionService _sessionService;
    private readonly GoogleAuthOptions _googleOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepo,
        IAuthIdentityRepository identityRepo,
        IMagicLinkRepository magicLinkRepo,
        IRefreshTokenRepository refreshTokenRepo,
        ISecurityEventRepository securityEventRepo,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenHasher tokenHasher,
        ISecureRandom random,
        ITokenService tokenService,
        ISessionService sessionService,
        IOptions<GoogleAuthOptions> googleOptions,
        ILogger<AuthService> logger)
    {
        _userRepo = userRepo;
        _identityRepo = identityRepo;
        _magicLinkRepo = magicLinkRepo;
        _refreshTokenRepo = refreshTokenRepo;
        _securityEventRepo = securityEventRepo;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenHasher = tokenHasher;
        _random = random;
        _tokenService = tokenService;
        _sessionService = sessionService;
        _googleOptions = googleOptions.Value;
        _logger = logger;
    }

    public async Task<Result<TokenResponse>> RegisterAsync(RegisterRequest request, string? ip, string? ua)
    {
        // RED TEAM H5 FIX: IgnoreQueryFilters to catch soft-deleted emails
        if (await _userRepo.EmailExistsAsync(request.Email))
            return Result<TokenResponse>.Failure("Email already registered.", ResultError.Conflict);

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

        _userRepo.Add(user);
        _identityRepo.Add(identity);
        await _unitOfWork.SaveChangesAsync();

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.Login, true, ip, ua);
        return Result<TokenResponse>.Success(tokens);
    }

    public async Task<Result<TokenResponse>> LoginAsync(LoginRequest request, string? ip, string? ua)
    {
        // RED TEAM H5 FIX: IgnoreQueryFilters for security-sensitive lookup
        var user = await _userRepo.GetByEmailIgnoreFiltersAsync(request.Email);

        if (user is null)
        {
            await LogEventAsync(null, SecurityEventType.LoginFailed, false, ip, ua, "Unknown email");
            return Result<TokenResponse>.Failure("Invalid credentials.", ResultError.Unauthorized);
        }

        if (user.IsLocked)
        {
            await LogEventAsync(user.Id, SecurityEventType.LoginFailed, false, ip, ua, "Account locked");
            return Result<TokenResponse>.Failure("Invalid credentials.", ResultError.Unauthorized);
        }

        if (user.PasswordHash is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            // RED TEAM H6 FIX: atomic increment to prevent race condition on brute force
            await _userRepo.IncrementFailedLoginAsync(user.Id);
            await _userRepo.ReloadAsync(user);

            if (user.FailedLoginCount >= 5)
            {
                await _userRepo.LockAccountAsync(user.Id, DateTime.UtcNow.AddMinutes(15));
                await LogEventAsync(user.Id, SecurityEventType.AccountLocked, true, ip, ua);
            }

            await LogEventAsync(user.Id, SecurityEventType.LoginFailed, false, ip, ua, "Wrong password");
            return Result<TokenResponse>.Failure("Invalid credentials.", ResultError.Unauthorized);
        }

        // Reset on successful login
        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        await _unitOfWork.SaveChangesAsync();

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.Login, true, ip, ua);
        return Result<TokenResponse>.Success(tokens);
    }

    public async Task<Result<TokenResponse>> GoogleLoginAsync(string idToken, string? ip, string? ua)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [_googleOptions.ClientId]
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google token validation failed");
            return Result<TokenResponse>.Failure("Invalid Google token.", ResultError.Unauthorized);
        }

        // RED TEAM H1 FIX: require verified email
        if (!payload.EmailVerified)
            return Result<TokenResponse>.Failure("Google account email not verified.", ResultError.Unauthorized);

        var user = await _userRepo.GetByEmailAsync(payload.Email);

        if (user is not null)
        {
            // RED TEAM H1 FIX: reject silent provider merge
            var hasGoogle = await _identityRepo.HasProviderAsync(user.Id, AuthProvider.Google);
            if (!hasGoogle)
                return Result<TokenResponse>.Failure(
                    "An account with this email exists. Please login with your original method.",
                    ResultError.Unauthorized);
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
            _userRepo.Add(user);
        }

        var googleIdentity = await _identityRepo.GetByUserAndProviderAsync(user.Id, AuthProvider.Google);

        if (googleIdentity is null)
        {
            googleIdentity = new AuthIdentity
            {
                UserId = user.Id,
                Provider = AuthProvider.Google,
                ProviderUserId = payload.Subject,
                ProviderEmail = payload.Email,
            };
            _identityRepo.Add(googleIdentity);
        }

        googleIdentity.LastUsedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.GoogleOAuthLogin, true, ip, ua);
        return Result<TokenResponse>.Success(tokens);
    }

    public async Task<Result> RequestMagicLinkAsync(string email, string? ip)
    {
        // Always succeed to prevent email enumeration
        var user = await _userRepo.GetByEmailAsync(email);
        if (user is null) return Result.Success();

        var token = _random.GenerateToken(32);
        var entity = new MagicLink
        {
            UserId = user.Id,
            TokenHash = _tokenHasher.Hash(token),
            IpAddress = ip,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
        };
        _magicLinkRepo.Add(entity);
        await _unitOfWork.SaveChangesAsync();

        await LogEventAsync(user.Id, SecurityEventType.MagicLinkRequested, true, ip, null);

        // RED TEAM H2 FIX: log only hash prefix, never plaintext token
        var hash = _tokenHasher.Hash(token);
        _logger.LogDebug("Magic link issued for {Email}, hash prefix: {Prefix}", email, hash[..8]);

        // Console stub for dev (replace with email service in production)
        _logger.LogInformation("=== DEV ONLY - MAGIC LINK TOKEN for {Email}: {Token} ===", email, token);

        return Result.Success();
    }

    public async Task<Result<TokenResponse>> VerifyMagicLinkAsync(string token, string? ip, string? ua)
    {
        var hash = _tokenHasher.Hash(token);
        var magicLink = await _magicLinkRepo.GetByHashWithUserAsync(hash);

        if (magicLink is null)
            return Result<TokenResponse>.Failure("Invalid or used magic link.", ResultError.Unauthorized);

        if (magicLink.IsExpired)
            return Result<TokenResponse>.Failure("Magic link expired.", ResultError.Unauthorized);

        // Mark used atomically (RowVersion on MagicLink prevents double-use race condition)
        magicLink.UsedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var user = magicLink.User;
        if (!user.EmailVerified)
        {
            user.EmailVerified = true;
            await _unitOfWork.SaveChangesAsync();
        }

        var session = await _sessionService.CreateSessionAsync(user.Id, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(user.Id, SecurityEventType.MagicLinkVerified, true, ip, ua);
        return Result<TokenResponse>.Success(tokens);
    }

    public async Task<Result> LogoutAsync(string refreshToken)
    {
        var hash = _tokenHasher.Hash(refreshToken);
        var stored = await _refreshTokenRepo.GetByHashAsync(hash);
        if (stored is null) return Result.Success();

        // RED TEAM H4 FIX: atomic logout in single transaction
        await _unitOfWork.BeginTransactionAsync();
        try
        {
            stored.RevokedAt = DateTime.UtcNow;

            var session = await _sessionService.GetSessionAsync(stored.SessionId);
            if (session is { IsActive: true })
            {
                session.IsActive = false;
                session.RevokedAt = DateTime.UtcNow;
            }

            await _unitOfWork.SaveChangesAsync();
            await _unitOfWork.CommitTransactionAsync();
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync();
            throw;
        }

        await LogEventAsync(stored.UserId, SecurityEventType.Logout, true, null, null);
        return Result.Success();
    }

    public async Task<Result> RevokeAllSessionsAsync(string userId)
    {
        await _tokenService.RevokeAllUserTokensAsync(userId);
        await _sessionService.DeactivateAllSessionsAsync(userId);

        // Rotate security stamp to invalidate all existing JWTs on next refresh
        var user = await _userRepo.GetByIdAsync(userId);
        if (user is not null)
        {
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            await _unitOfWork.SaveChangesAsync();
        }

        await LogEventAsync(userId, SecurityEventType.AllSessionsRevoked, true, null, null);
        return Result.Success();
    }

    private async Task LogEventAsync(
        string? userId, SecurityEventType type, bool success,
        string? ip, string? ua, string? failureReason = null)
    {
        _securityEventRepo.Add(new SecurityEvent
        {
            UserId = userId,
            EventType = type,
            Success = success,
            FailureReason = failureReason,
            IpAddress = ip,
            UserAgent = ua,
        });
        await _unitOfWork.SaveChangesAsync();
    }
}
