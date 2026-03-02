# Phase 1: Backend — Replace MFA Service with Email OTP

## Overview
- **Priority:** High
- **Status:** Pending
- **Effort:** 3h
- Replace TOTP-based MfaService with EmailOtpMfaService using Redis-stored OTP codes

## Key Insights
- Magic link pattern in AuthService (line 258) logs tokens with `_logger.LogDebug` — reuse same pattern for OTP
- IRedisService already supports `SetAsync`, `GetAsync`, `DeleteAsync` with TTL — perfect for OTP storage
- MFA token (5min JWT) mechanism is solid — keep it for challenge flow
- Recovery codes unnecessary — email IS the fallback

## Requirements

### Functional
- `POST /mfa/setup` → sends 6-digit OTP to user email, returns `{ message }` (no QR, no secret)
- `POST /mfa/verify-setup` → validates OTP, enables MFA, returns `{ mfaEnabled: true }`
- `POST /mfa/challenge` → sends OTP to email, user submits code → tokens issued
- `POST /mfa/disable` → sends OTP to email, user submits code → MFA disabled
- `GET /mfa/status` → returns `{ mfaEnabled: bool }` (new endpoint, fixes frontend issue #5)

### Non-Functional
- Rate limit: 1 OTP per 60s per user (Redis key `mfa:rate:{userId}`)
- OTP TTL: 5 minutes in Redis
- OTP stored as SHA-256 hash (not plaintext)
- Max 5 failed attempts per OTP (Redis counter `mfa:attempts:{userId}`)

## Architecture

### OTP Flow
```
Enable MFA:
  User clicks "Enable" → POST /mfa/setup → backend generates 6-digit code
  → stores SHA-256(code) in Redis (key: mfa:otp:{userId}, TTL: 5min)
  → logs code to console (dev) → returns { message: "OTP sent" }
  → User enters code → POST /mfa/verify-setup → validates → MFA enabled

Login with MFA:
  POST /login → if MfaEnabled → returns mfaToken
  → POST /mfa/challenge (with mfaToken) → backend sends OTP to email
  → User enters code → POST /mfa/challenge/verify → validates → tokens issued
```

**Note:** Challenge flow needs a 2-step approach:
1. `POST /mfa/challenge/send` — send OTP (takes mfaToken)
2. `POST /mfa/challenge/verify` — verify OTP + mfaToken → issue tokens

This replaces the single `/mfa/challenge` endpoint.

### Redis Key Schema
```
mfa:otp:{userId}        → SHA-256 hash of 6-digit code (TTL: 5min)
mfa:rate:{userId}       → "1" (TTL: 60s) — rate limit
mfa:attempts:{userId}   → attempt counter (TTL: 5min)
```

## Related Code Files

### Files to Modify
| File | Action | Description |
|------|--------|-------------|
| `Application/Services/MfaService.cs` | **Rewrite** | Replace TOTP logic with email OTP + Redis |
| `Application/Interfaces/IMfaService.cs` | **Modify** | Update interface for email OTP methods |
| `Application/DTOs/Auth/AuthDtos.cs` | **Modify** | Update MFA DTOs (remove QR/secret, add status) |
| `API/Controllers/MfaController.cs` | **Modify** | Update endpoints, remove QR rendering, add /status |
| `Application/Options/MfaOptions.cs` | **Modify** | Remove EncryptionKey, keep Issuer |
| `Domain/Entities/User.cs` | **Modify** | Remove MfaSecret property |
| `API/Extensions/ServiceCollectionExtensions.cs` | **Modify** | Update DI registration |

### Files to Delete
| File | Reason |
|------|--------|
| `Application/Services/MfaCryptoHelper.cs` | TOTP/AES crypto no longer needed |
| `Domain/Entities/MfaRecoveryCode.cs` | Recovery codes eliminated |
| `Infrastructure/Repositories/MfaRecoveryCodeRepository.cs` | No more recovery codes |
| `Infrastructure/Data/Configurations/MfaRecoveryCodeConfiguration.cs` | EF config for deleted entity |

### NuGet Packages to Remove
- `OtpNet` — TOTP library
- `QRCoder` — QR code generation

## Implementation Steps

### 1. Update DTOs (`AuthDtos.cs`)
Replace MFA DTOs:
```csharp
// Remove: MfaSetupResponse, MfaRecoveryCodesResponse
// Modify:
public record MfaSetupResponse(string Message); // no more QR/secret
public record MfaVerifySetupRequest([Required, StringLength(6, MinimumLength = 6)] string Code);
public record MfaChallengeRequest([Required] string MfaToken, [Required, StringLength(6, MinimumLength = 6)] string Code);
public record MfaDisableRequest([Required, StringLength(6, MinimumLength = 6)] string Code);
public record MfaStatusResponse(bool MfaEnabled);
// Remove: MfaChallengeResponse — keep as-is, still used by AuthResponse
// Add:
public record MfaSendOtpRequest([Required] string MfaToken); // for challenge/send
```

### 2. Update IMfaService interface
```csharp
public interface IMfaService
{
    Task<Result<MfaSetupResponse>> SetupAsync(string userId);
    Task<Result> VerifySetupAsync(string userId, string code);
    Task<Result> SendChallengeOtpAsync(string mfaToken);
    Task<Result<TokenResponse>> VerifyChallengeAsync(string mfaToken, string code, string? ip, string? ua);
    Task<Result> SendDisableOtpAsync(string userId);
    Task<Result> DisableAsync(string userId, string code);
    Task<MfaStatusResponse> GetStatusAsync(string userId);
    string GenerateMfaToken(string userId);
    string? ValidateMfaToken(string mfaToken);
}
```

### 3. Rewrite MfaService
Core logic:
- `GenerateAndStoreOtp(userId)` → generates 6-digit random code, stores SHA-256 hash in Redis with 5min TTL, logs code to console, checks rate limit
- `ValidateOtp(userId, code)` → fetches hash from Redis, compares, tracks attempts, deletes on success
- Keep `GenerateMfaToken` / `ValidateMfaToken` unchanged (JWT logic is solid)
- Remove all TOTP/encryption/recovery code logic

### 4. Update MfaController
- `POST /setup` → `[Authorize]`, calls SetupAsync, returns message
- `POST /verify-setup` → `[Authorize]`, validates code, enables MFA
- `POST /challenge/send` → `[AllowAnonymous]`, takes mfaToken, sends OTP
- `POST /challenge/verify` → `[AllowAnonymous]`, takes mfaToken + code, returns tokens
- `POST /disable` → `[Authorize]`, sends OTP first (separate endpoint) then validates
- `GET /status` → `[Authorize]`, returns { mfaEnabled }
- Remove QRCoder import and RenderQrCode helper

### 5. Update MfaOptions
```csharp
public class MfaOptions
{
    public string Issuer { get; set; } = "TicketStar";
    // Remove: EncryptionKey (no longer needed)
}
```

### 6. Remove User.MfaSecret
Remove `MfaSecret` property from User entity. MFA state tracked only by `MfaEnabled` bool.

### 7. Delete files
Delete MfaCryptoHelper, MfaRecoveryCode entity, MfaRecoveryCodeRepository, MfaRecoveryCodeConfiguration.

### 8. Remove NuGet packages
```bash
cd backend/src/TicketStar.Application && dotnet remove package OtpNet
cd backend/src/TicketStar.API && dotnet remove package QRCoder
```

### 9. Update DI registration
Remove IMfaRecoveryCodeRepository registration, update MfaService registration if needed.

## Todo List
- [ ] Update MFA DTOs in AuthDtos.cs
- [ ] Update IMfaService interface
- [ ] Rewrite MfaService with email OTP + Redis logic
- [ ] Update MfaController with new endpoints
- [ ] Simplify MfaOptions (remove EncryptionKey)
- [ ] Remove User.MfaSecret property
- [ ] Delete MfaCryptoHelper, MfaRecoveryCode, MfaRecoveryCodeRepository, MfaRecoveryCodeConfiguration
- [ ] Remove OtpNet and QRCoder NuGet packages
- [ ] Update DI in ServiceCollectionExtensions
- [ ] Verify build compiles clean

## Success Criteria
- `dotnet build` passes with no errors
- All MFA endpoints accept/return new DTOs
- OTP codes logged to console in dev mode
- Redis stores hashed OTP with 5min TTL
- Rate limiting prevents OTP spam (1/60s)
- `GET /mfa/status` returns correct MFA state
- No references to TOTP, QRCoder, OtpNet remain

## Risk Assessment
- **DB migration needed** — removing MfaSecret column + MfaRecoveryCode table. Mitigated: no production data yet
- **Existing tests may break** — need to update/rewrite MFA tests. Mitigated: update in phase 3

## Security Considerations
- OTP stored as SHA-256 hash in Redis (not plaintext)
- Rate limiting: 1 OTP/60s, max 5 attempts per code
- OTP auto-expires after 5min (Redis TTL)
- Deleted on successful validation (single use)
- Security events still logged for all MFA operations
