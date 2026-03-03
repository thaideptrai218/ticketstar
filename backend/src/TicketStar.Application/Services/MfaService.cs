using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TicketStar.Application.Common;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class MfaService : IMfaService
{
    private const string MfaPurposeClaim = "mfa_challenge";
    private const int MfaTokenMinutes = 5;
    private const int OtpLength = 6;
    private const int OtpTtlMinutes = 5;
    private const int RateLimitSeconds = 60;
    private const int MaxAttempts = 5;

    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISecurityEventRepository _securityEventRepo;
    private readonly ISessionService _sessionService;
    private readonly ITokenService _tokenService;
    private readonly IRedisService _redis;
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<MfaService> _logger;

    public MfaService(
        IUserRepository userRepo,
        IUnitOfWork unitOfWork,
        ISecurityEventRepository securityEventRepo,
        ISessionService sessionService,
        ITokenService tokenService,
        IRedisService redis,
        IOptions<JwtOptions> jwtOptions,
        ILogger<MfaService> logger)
    {
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _securityEventRepo = securityEventRepo;
        _sessionService = sessionService;
        _tokenService = tokenService;
        _redis = redis;
        _jwtOptions = jwtOptions.Value;
        _logger = logger;
    }

    public async Task<Result<MfaSetupResponse>> SetupAsync(string userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null)
            return Result<MfaSetupResponse>.Failure("User not found.", ResultError.NotFound);

        if (user.MfaEnabled)
            return Result<MfaSetupResponse>.Failure("MFA is already enabled.", ResultError.Validation);

        var sendResult = await GenerateAndStoreOtpAsync(userId, user.Email);
        if (!sendResult.IsSuccess)
            return Result<MfaSetupResponse>.Failure(sendResult.Error!, sendResult.ErrorType ?? ResultError.Validation);

        return Result<MfaSetupResponse>.Success(new MfaSetupResponse("OTP sent to your email."));
    }

    public async Task<Result> VerifySetupAsync(string userId, string code)
    {
        var validateResult = await ValidateOtpAsync(userId, code);
        if (!validateResult.IsSuccess)
            return validateResult;

        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null)
            return Result.Failure("User not found.", ResultError.NotFound);

        user.MfaEnabled = true;
        await _unitOfWork.SaveChangesAsync();
        await LogEventAsync(userId, SecurityEventType.MfaEnabled, true);
        return Result.Success();
    }

    public async Task<Result> SendChallengeOtpAsync(string mfaToken)
    {
        var userId = ValidateMfaToken(mfaToken);
        if (userId is null)
            return Result.Failure("Invalid or expired MFA token.", ResultError.Unauthorized);

        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null || !user.MfaEnabled)
            return Result.Failure("MFA not configured.", ResultError.Unauthorized);

        return await GenerateAndStoreOtpAsync(userId, user.Email);
    }

    public async Task<Result<TokenResponse>> VerifyChallengeAsync(
        string mfaToken, string code, string? ip, string? ua)
    {
        var userId = ValidateMfaToken(mfaToken);
        if (userId is null)
            return Result<TokenResponse>.Failure("Invalid or expired MFA token.", ResultError.Unauthorized);

        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null || !user.MfaEnabled)
            return Result<TokenResponse>.Failure("MFA not configured.", ResultError.Unauthorized);

        var validateResult = await ValidateOtpAsync(userId, code);
        if (!validateResult.IsSuccess)
        {
            await LogEventAsync(userId, SecurityEventType.MfaChallengeFailed, false, ip, ua);
            return Result<TokenResponse>.Failure(validateResult.Error!, validateResult.ErrorType ?? ResultError.Validation);
        }

        var session = await _sessionService.CreateSessionAsync(userId, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(userId, SecurityEventType.MfaChallengeSuccess, true, ip, ua);
        return Result<TokenResponse>.Success(tokens);
    }

    public async Task<Result> SendDisableOtpAsync(string userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null || !user.MfaEnabled)
            return Result.Failure("MFA is not enabled.", ResultError.Validation);

        return await GenerateAndStoreOtpAsync(userId, user.Email);
    }

    public async Task<Result> DisableAsync(string userId, string code)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null || !user.MfaEnabled)
            return Result.Failure("MFA is not enabled.", ResultError.Validation);

        var validateResult = await ValidateOtpAsync(userId, code);
        if (!validateResult.IsSuccess)
            return validateResult;

        user.MfaEnabled = false;
        await _unitOfWork.SaveChangesAsync();
        await LogEventAsync(userId, SecurityEventType.MfaDisabled, true);
        return Result.Success();
    }

    public async Task<MfaStatusResponse> GetStatusAsync(string userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        return new MfaStatusResponse(user?.MfaEnabled ?? false);
    }

    public string GenerateMfaToken(string userId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: [
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim("purpose", MfaPurposeClaim),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            ],
            expires: DateTime.UtcNow.AddMinutes(MfaTokenMinutes),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string? ValidateMfaToken(string mfaToken)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(mfaToken, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _jwtOptions.Issuer,
                ValidAudience = _jwtOptions.Audience,
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.Zero,
            }, out _);

            if (principal.Claims.FirstOrDefault(c => c.Type == "purpose")?.Value != MfaPurposeClaim) return null;
            return principal.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value
                ?? principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        }
        catch { return null; }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<Result> GenerateAndStoreOtpAsync(string userId, string email)
    {
        // Rate limit: 1 OTP per 60s
        var rateKey = $"mfa:rate:{userId}";
        if (await _redis.ExistsAsync(rateKey))
            return Result.Failure("Please wait before requesting a new code.", ResultError.RateLimited);

        // Generate 6-digit code
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        // Store SHA-256 hash in Redis with 5min TTL
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant();
        await _redis.SetAsync($"mfa:otp:{userId}", hash, TimeSpan.FromMinutes(OtpTtlMinutes));

        // Reset attempt counter
        await _redis.DeleteAsync($"mfa:attempts:{userId}");

        // Set rate limit key
        await _redis.SetAsync(rateKey, "1", TimeSpan.FromSeconds(RateLimitSeconds));

        // Log OTP to console (dev only — Debug level filtered in production)
        _logger.LogDebug("=== DEV ONLY - MFA OTP for {Email}: {Code} ===", email, code);

        return Result.Success();
    }

    private async Task<Result> ValidateOtpAsync(string userId, string code)
    {
        // Check attempt counter
        var attemptsKey = $"mfa:attempts:{userId}";
        var attempts = await _redis.IncrementAsync(attemptsKey);
        if (attempts == 1)
            await _redis.ExpireAsync(attemptsKey, TimeSpan.FromMinutes(OtpTtlMinutes));

        if (attempts > MaxAttempts)
        {
            // Delete the OTP to force re-request
            await _redis.DeleteAsync($"mfa:otp:{userId}");
            return Result.Failure("Too many attempts. Please request a new code.", ResultError.RateLimited);
        }

        var storedHash = await _redis.GetAsync($"mfa:otp:{userId}");
        if (storedHash is null)
            return Result.Failure("No active OTP. Please request a new code.", ResultError.Validation);

        var inputHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant();
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(storedHash), Encoding.UTF8.GetBytes(inputHash)))
            return Result.Failure("Invalid code.", ResultError.Unauthorized);

        // OTP is single-use — delete on success
        await _redis.DeleteAsync($"mfa:otp:{userId}");
        await _redis.DeleteAsync(attemptsKey);
        return Result.Success();
    }

    private async Task LogEventAsync(string userId, SecurityEventType type, bool success,
        string? ip = null, string? ua = null)
    {
        _securityEventRepo.Add(new SecurityEvent
        {
            UserId = userId,
            EventType = type,
            Success = success,
            IpAddress = ip,
            UserAgent = ua,
        });
        await _unitOfWork.SaveChangesAsync();
    }
}
