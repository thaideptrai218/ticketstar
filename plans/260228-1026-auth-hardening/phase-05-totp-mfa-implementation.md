# Phase 5: TOTP MFA Implementation

## Context Links

- [AuthController.cs](../../backend/src/TicketStar.API/Controllers/AuthController.cs) - auth endpoints
- [AuthService.cs](../../backend/src/TicketStar.Application/Services/AuthService.cs) - `LoginAsync()` returns `TokenResponse`
- [User.cs](../../backend/src/TicketStar.Domain/Entities/User.cs) - user entity
- [AuthDtos.cs](../../backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs) - DTOs
- [SecurityEventType.cs](../../backend/src/TicketStar.Domain/Enums/SecurityEventType.cs) - event types
- [QRCoder](../../backend/src/TicketStar.API/TicketStar.API.csproj) - already installed

## Overview

- **Priority:** MEDIUM
- **Status:** pending
- **Description:** Implement TOTP (RFC 6238) MFA. Users can enable MFA via authenticator app. Login flow gains a challenge step. Recovery codes for backup access.

## Key Insights

- Use `Otp.NET` NuGet for TOTP generation/validation (lightweight, RFC 6238 compliant)
- `QRCoder` already installed -- use for QR code generation
- Login flow change: if MFA enabled, return `mfa_required` response with temporary `mfaToken` instead of full tokens. User submits TOTP code + mfaToken to complete login.
- TOTP secret stored encrypted in DB (AES-256). Encryption key from config.
- Recovery codes: 8 codes, 8 chars each, hashed with SHA-256, one-time use

## Requirements

### Functional

- **Setup**: `POST /api/auth/mfa/setup` -- generate TOTP secret + QR URI, return base32 secret + QR image (base64 PNG)
- **Verify Setup**: `POST /api/auth/mfa/verify-setup` -- user submits TOTP code to confirm setup. Generates recovery codes.
- **Challenge**: `POST /api/auth/mfa/challenge` -- submit TOTP code (or recovery code) + mfaToken to complete login
- **Disable**: `POST /api/auth/mfa/disable` -- requires current password or TOTP code
- Login/GoogleLogin/MagicLink: if user has MFA enabled, return `MfaChallengeResponse` instead of `TokenResponse`
- Recovery codes: 8 codes, shown once during setup, hashed in DB

### Non-Functional

- TOTP: SHA1, 6 digits, 30s period (standard for Google Authenticator compatibility)
- Time window tolerance: +/- 1 step (90s total window)
- TOTP secret: 20 bytes (160 bits), stored AES-256 encrypted
- Rate limit MFA challenge: 5 attempts per mfaToken

## Architecture

### Login Flow with MFA

```
1. User submits email + password
2. AuthService validates credentials (existing flow)
3. If user.MfaEnabled:
   a. Generate short-lived mfaToken (JWT, 5min, contains userId + "mfa_pending" purpose)
   b. Return MfaChallengeResponse { MfaToken, MfaRequired: true }
4. User submits TOTP code + mfaToken to /mfa/challenge
5. Validate mfaToken JWT + TOTP code
6. Issue full token pair (access + refresh)
```

### Data Model

```
User entity additions:
  - MfaEnabled: bool (default false)
  - MfaSecret: string? (AES-256 encrypted TOTP secret)

New entity: MfaRecoveryCode
  - Id: Guid
  - UserId: string
  - CodeHash: string (SHA-256)
  - UsedAt: DateTime?
```

## Related Code Files

### Files to Modify

- `backend/src/TicketStar.Domain/Entities/User.cs` -- add `MfaEnabled`, `MfaSecret` properties
- `backend/src/TicketStar.Application/Services/AuthService.cs` -- modify `LoginAsync`, `GoogleLoginAsync`, `VerifyMagicLinkAsync` to check MFA
- `backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs` -- new DTOs
- `backend/src/TicketStar.Domain/Enums/SecurityEventType.cs` -- add MFA event types
- `backend/src/TicketStar.Infrastructure/Data/AppDbContext.cs` -- add `MfaRecoveryCode` DbSet
- `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs` -- register MFA service

### Files to Create

- `backend/src/TicketStar.Domain/Entities/MfaRecoveryCode.cs` -- entity
- `backend/src/TicketStar.Application/Interfaces/IMfaService.cs` -- MFA operations interface
- `backend/src/TicketStar.Application/Services/MfaService.cs` -- TOTP + recovery code logic
- `backend/src/TicketStar.Application/Options/MfaOptions.cs` -- encryption key config
- `backend/src/TicketStar.API/Controllers/MfaController.cs` -- MFA endpoints
- `backend/src/TicketStar.Infrastructure/Data/Configurations/MfaRecoveryCodeConfiguration.cs` -- EF config
- EF Migration for User MFA columns + MfaRecoveryCode table

## Implementation Steps

1. **Add NuGet package**
    - Add `Otp.NET` to `TicketStar.Application.csproj`

2. **Create `MfaOptions.cs`**

    ```csharp
    namespace TicketStar.Application.Options;
    public class MfaOptions
    {
        public const string SectionName = "Mfa";
        public string EncryptionKey { get; init; } = ""; // 32-byte base64 for AES-256
    }
    ```

3. **Update `User.cs`**

    ```csharp
    public bool MfaEnabled { get; set; }
    public string? MfaSecret { get; set; } // AES-256 encrypted
    ```

4. **Create `MfaRecoveryCode.cs`**

    ```csharp
    namespace TicketStar.Domain.Entities;
    public class MfaRecoveryCode
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string UserId { get; set; } = null!;
        public string CodeHash { get; set; } = null!;
        public DateTime? UsedAt { get; set; }
        public bool IsUsed => UsedAt is not null;
        public User User { get; set; } = null!;
    }
    ```

5. **Create `IMfaService.cs`**

    ```csharp
    namespace TicketStar.Application.Interfaces;
    public interface IMfaService
    {
        Task<MfaSetupResponse> GenerateSetupAsync(string userId);
        Task<Result<MfaRecoveryCodesResponse>> VerifySetupAsync(string userId, string code);
        Task<Result<TokenResponse>> VerifyChallengeAsync(string mfaToken, string code, string? ip, string? ua);
        Task<Result> DisableAsync(string userId, string code);
    }
    ```

6. **Create `MfaService.cs`**
    - `GenerateSetupAsync`: Generate 20-byte secret, encrypt with AES-256, store in `User.MfaSecret` (NOT yet enabled). Return base32 secret + otpauth URI + QR code base64 PNG.
    - `VerifySetupAsync`: Validate TOTP code against stored secret. If valid, set `MfaEnabled = true`, generate 8 recovery codes, hash and store them, return plaintext codes.
    - `VerifyChallengeAsync`: Decode mfaToken JWT to get userId, validate TOTP code (or check recovery codes). If valid, issue full token pair.
    - `DisableAsync`: Validate code, set `MfaEnabled = false`, clear `MfaSecret`, delete recovery codes.
    - TOTP validation: use `Otp.NET` `Totp.VerifyTotp(code, out timeStep, VerificationWindow(1))` for +/- 1 step tolerance.

7. **Update auth DTOs** (`AuthDtos.cs`)

    ```csharp
    // New DTOs
    public record MfaSetupResponse(string Secret, string QrCodeUri, string QrCodeBase64);
    public record MfaVerifySetupRequest([Required] string Code);
    public record MfaChallengeRequest([Required] string MfaToken, [Required] string Code);
    public record MfaChallengeResponse(string MfaToken, bool MfaRequired);
    public record MfaRecoveryCodesResponse(List<string> RecoveryCodes);
    public record MfaDisableRequest([Required] string Code);
    ```

8. **Modify `AuthService.LoginAsync()`**
   After successful password validation (line 127), before creating session:

    ```csharp
    if (user.MfaEnabled)
    {
        var mfaToken = GenerateMfaToken(user.Id); // short-lived JWT, 5min
        return Result<TokenResponse>.Failure("MFA_REQUIRED", ResultError.Unauthorized);
        // Actually need a different return type...
    }
    ```

    **Design decision**: Change return type to support both outcomes:
    - Option A: Return `Result<object>` that can be either `TokenResponse` or `MfaChallengeResponse` -- ugly
    - Option B: New `Result<AuthResponse>` where `AuthResponse` is a discriminated union -- cleaner
    - **Decision: Option B**

    ```csharp
    public record AuthResponse
    {
        public TokenResponse? Tokens { get; init; }
        public MfaChallengeResponse? MfaChallenge { get; init; }
        public bool RequiresMfa => MfaChallenge is not null;
    }
    ```

    Update `IAuthService` return types: `LoginAsync`, `GoogleLoginAsync`, `VerifyMagicLinkAsync` return `Result<AuthResponse>` instead of `Result<TokenResponse>`.

9. **Create `MfaController.cs`**

    ```csharp
    [Authorize]
    [Route("api/auth/mfa")]
    public class MfaController : ApiControllerBase
    {
        [HttpPost("setup")]        // Generate secret + QR
        [HttpPost("verify-setup")] // Confirm with TOTP code, get recovery codes
        [HttpPost("challenge")]    // [AllowAnonymous] -- submit TOTP + mfaToken
        [HttpPost("disable")]      // Disable MFA
    }
    ```

    Note: `/challenge` is `[AllowAnonymous]` since user isn't fully authenticated yet.

10. **MFA Token (short-lived JWT)**
    - Generate in `TokenService` or `MfaService`
    - Claims: `sub` (userId), `purpose: "mfa_challenge"`, 5-min expiry
    - Sign with same JWT secret
    - Validate in `VerifyChallengeAsync`: check purpose claim, expiry

11. **Update `AuthController`**
    - Handle `AuthResponse` in login/google/magic-link endpoints
    - If `RequiresMfa`, return `MfaChallengeResponse` (no cookie set yet)
    - If not, set cookie + return `AccessTokenResponse` as before

12. **Add SecurityEventTypes**

    ```csharp
    MfaEnabled = 16,
    MfaDisabled = 17,
    MfaChallengeSuccess = 18,
    MfaChallengeFailed = 19,
    MfaRecoveryCodeUsed = 20
    ```

13. **EF Migration**
    - Add `MfaEnabled`, `MfaSecret` columns to Users table
    - Create `MfaRecoveryCodes` table
    - Create EF configuration for `MfaRecoveryCode`

14. **Register services**
    ```csharp
    services.AddOptions<MfaOptions>().BindConfiguration(MfaOptions.SectionName).ValidateOnStart();
    services.AddScoped<IMfaService, MfaService>();
    ```

## Todo List

- [ ] Add `Otp.NET` NuGet package
- [ ] Create `MfaOptions.cs`
- [ ] Add `MfaEnabled`, `MfaSecret` to `User.cs`
- [ ] Create `MfaRecoveryCode.cs` entity
- [ ] Create `MfaRecoveryCodeConfiguration.cs` EF config
- [ ] Create `IMfaService.cs` interface
- [ ] Create `MfaService.cs` (setup, verify-setup, challenge, disable)
- [ ] Create `AuthResponse` discriminated union DTO
- [ ] Update `IAuthService` return types to `Result<AuthResponse>`
- [ ] Update `AuthService` (Login, GoogleLogin, MagicLink) to check MFA
- [ ] Add MFA DTOs to `AuthDtos.cs`
- [ ] Create `MfaController.cs`
- [ ] Update `AuthController` to handle `AuthResponse`
- [ ] Add `SecurityEventType` entries for MFA
- [ ] Create EF migration
- [ ] Register services in DI
- [ ] Test: MFA setup flow (generate -> verify -> recovery codes)
- [ ] Test: Login with MFA (credentials -> challenge -> TOTP -> tokens)
- [ ] Test: Recovery code login
- [ ] Test: Disable MFA
- [ ] Test: MFA token expiry (>5min)

## Success Criteria

- Users can enable/disable TOTP MFA
- Login with MFA requires two steps: credentials, then TOTP code
- Recovery codes work as backup
- Standard authenticator apps (Google Authenticator, Authy, 1Password) compatible
- QR code scannable and correct
- TOTP secrets encrypted at rest

## Risk Assessment

- **Breaking API change**: `LoginAsync` return type changes from `Result<TokenResponse>` to `Result<AuthResponse>`. Frontend must handle both `tokens` and `mfaChallenge` response shapes.
- **Encryption key management**: `MfaOptions.EncryptionKey` must be securely stored and never rotated without re-encrypting all secrets.
- **Clock drift**: Server time must be NTP-synced. +/- 1 step tolerance (90s) covers most drift.
- **Recovery code exhaustion**: User must be warned when codes are running low. Consider allowing regeneration.

## Security Considerations

- TOTP secret encrypted with AES-256 at rest (not plaintext in DB)
- Recovery codes hashed with SHA-256 (one-way, like passwords)
- MFA token is short-lived (5min) and single-purpose (can't be used as access token)
- Rate limit `/mfa/challenge` to prevent brute-force (6-digit TOTP = 1M possibilities)
- TOTP codes are time-based, used code should be rejected for the current window (prevent replay)
- MFA setup requires authentication (can't enable MFA without being logged in)
- MFA disable requires current TOTP code (or recovery code)

## Next Steps

- Frontend: MFA setup page in settings, MFA challenge step in login flow
- Consider enforcing MFA for admin/organizer roles
- Consider backup email verification as alternative second factor
