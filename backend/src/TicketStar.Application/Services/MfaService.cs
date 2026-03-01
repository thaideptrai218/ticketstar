using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
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

    private readonly IUserRepository _userRepo;
    private readonly IMfaRecoveryCodeRepository _recoveryCodeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ISecurityEventRepository _securityEventRepo;
    private readonly ISessionService _sessionService;
    private readonly ITokenService _tokenService;
    private readonly MfaOptions _mfaOptions;
    private readonly JwtOptions _jwtOptions;
    private readonly byte[] _encryptionKey;

    public MfaService(
        IUserRepository userRepo,
        IMfaRecoveryCodeRepository recoveryCodeRepo,
        IUnitOfWork unitOfWork,
        ISecurityEventRepository securityEventRepo,
        ISessionService sessionService,
        ITokenService tokenService,
        IOptions<MfaOptions> mfaOptions,
        IOptions<JwtOptions> jwtOptions)
    {
        _userRepo = userRepo;
        _recoveryCodeRepo = recoveryCodeRepo;
        _unitOfWork = unitOfWork;
        _securityEventRepo = securityEventRepo;
        _sessionService = sessionService;
        _tokenService = tokenService;
        _mfaOptions = mfaOptions.Value;
        _jwtOptions = jwtOptions.Value;
        _encryptionKey = Convert.FromBase64String(_mfaOptions.EncryptionKey);
    }

    public async Task<MfaSetupResponse> GenerateSetupAsync(string userId)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        // H2: Prevent concurrent setup from overwriting an already-enabled MFA secret.
        if (user.MfaEnabled)
            throw new InvalidOperationException("MFA is already enabled for this account.");

        var base32Secret = MfaCryptoHelper.GenerateTotpSecret();
        user.MfaSecret = MfaCryptoHelper.Encrypt(base32Secret, _encryptionKey);
        await _unitOfWork.SaveChangesAsync();

        var uri = MfaCryptoHelper.BuildOtpAuthUri(base32Secret, user.Email, _mfaOptions.Issuer);
        return new MfaSetupResponse(base32Secret, uri, QrCodeBase64: "");
        // Note: QR image is generated in MfaController (QRCoder lives in API layer).
    }

    public async Task<Result<MfaRecoveryCodesResponse>> VerifySetupAsync(string userId, string code)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user?.MfaSecret is null)
            return Result<MfaRecoveryCodesResponse>.Failure("MFA setup not initiated.", ResultError.Validation);

        var base32Secret = MfaCryptoHelper.Decrypt(user.MfaSecret, _encryptionKey);
        if (!MfaCryptoHelper.VerifyTotp(base32Secret, code))
            return Result<MfaRecoveryCodesResponse>.Failure("Invalid TOTP code.", ResultError.Unauthorized);

        user.MfaEnabled = true;

        // Replace any existing recovery codes
        await _recoveryCodeRepo.DeleteAllByUserAsync(userId);

        var (plainCodes, hashes) = MfaCryptoHelper.GenerateRecoveryCodes();
        foreach (var hash in hashes)
            _recoveryCodeRepo.Add(new MfaRecoveryCode { UserId = userId, CodeHash = hash });

        await _unitOfWork.SaveChangesAsync();
        await LogEventAsync(userId, SecurityEventType.MfaEnabled, true);
        return Result<MfaRecoveryCodesResponse>.Success(new MfaRecoveryCodesResponse(plainCodes));
    }

    public async Task<Result<TokenResponse>> VerifyChallengeAsync(string mfaToken, string code, string? ip, string? ua)
    {
        var userId = ValidateMfaToken(mfaToken);
        if (userId is null)
            return Result<TokenResponse>.Failure("Invalid or expired MFA token.", ResultError.Unauthorized);

        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null || !user.MfaEnabled || user.MfaSecret is null)
            return Result<TokenResponse>.Failure("MFA not configured.", ResultError.Unauthorized);

        var base32Secret = MfaCryptoHelper.Decrypt(user.MfaSecret, _encryptionKey);
        bool valid = MfaCryptoHelper.VerifyTotp(base32Secret, code);

        if (!valid)
        {
            bool consumed = await TryConsumeRecoveryCodeAsync(userId, code);
            if (!consumed)
            {
                await LogEventAsync(userId, SecurityEventType.MfaChallengeFailed, false, ip, ua);
                return Result<TokenResponse>.Failure("Invalid code.", ResultError.Unauthorized);
            }
            await LogEventAsync(userId, SecurityEventType.MfaRecoveryCodeUsed, true, ip, ua);
        }

        var session = await _sessionService.CreateSessionAsync(userId, ip, ua);
        var tokens = await _tokenService.GenerateTokenPairAsync(user, session);
        await LogEventAsync(userId, SecurityEventType.MfaChallengeSuccess, true, ip, ua);
        return Result<TokenResponse>.Success(tokens);
    }

    public async Task<Result> DisableAsync(string userId, string code)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user is null || !user.MfaEnabled || user.MfaSecret is null)
            return Result.Failure("MFA is not enabled.", ResultError.Validation);

        var base32Secret = MfaCryptoHelper.Decrypt(user.MfaSecret, _encryptionKey);
        bool valid = MfaCryptoHelper.VerifyTotp(base32Secret, code)
                     || await TryConsumeRecoveryCodeAsync(userId, code);

        if (!valid)
            return Result.Failure("Invalid code.", ResultError.Unauthorized);

        user.MfaEnabled = false;
        user.MfaSecret = null;
        await _recoveryCodeRepo.DeleteAllByUserAsync(userId);
        await _unitOfWork.SaveChangesAsync();
        await LogEventAsync(userId, SecurityEventType.MfaDisabled, true);
        return Result.Success();
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

    private async Task<bool> TryConsumeRecoveryCodeAsync(string userId, string code)
    {
        var hash = MfaCryptoHelper.HashCode(code);
        var codes = await _recoveryCodeRepo.GetByUserAsync(userId);
        var hashBytes = Encoding.UTF8.GetBytes(hash);
        var match = codes.FirstOrDefault(rc =>
            !rc.IsUsed &&
            CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(rc.CodeHash), hashBytes));
        if (match is null) return false;

        match.UsedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
        return true;
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
