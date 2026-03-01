# Phase Implementation Report

### Executed Phase
- Phase: code-review-fixes (ad-hoc, no plan file)
- Plan: none
- Status: completed

### Files Modified

| File | Change |
|------|--------|
| `backend/src/TicketStar.API/Controllers/MfaController.cs` | C1: Use HttpOnly cookie for refresh token; L2: remove duplicate helpers |
| `backend/src/TicketStar.API/Controllers/AuthController.cs` | L2: remove duplicate helpers, use base GetUserId() in RevokeAllSessions |
| `backend/src/TicketStar.API/Controllers/ApiControllerBase.cs` | L2: add GetUserId/GetIp/GetUserAgent/IsHttps shared helpers |
| `backend/src/TicketStar.API/Extensions/ServiceCollectionExtensions.cs` | C2: OnTokenValidated rejects mfa_challenge tokens |
| `backend/src/TicketStar.Application/Services/MfaService.cs` | H1: FixedTimeEquals for recovery code; H2: guard MfaEnabled check |
| `backend/src/TicketStar.Application/Services/AuthService.cs` | H3: move BlacklistUserAsync after CommitTransactionAsync |
| `backend/src/TicketStar.API/RateLimiting/RedisRateLimiter.cs` | H4: AcquireAsyncCore uses ScriptEvaluateAsync |
| `backend/src/TicketStar.Application/Services/RedisGracePeriodCache.cs` | M2: strip refresh token before caching |
| `backend/src/TicketStar.Infrastructure/Cache/RedisService.cs` | M3: catch Exception instead of RedisException |
| `backend/src/TicketStar.Application/DTOs/Auth/AuthDtos.cs` | M4: StringLength(8) on MFA code fields |

### Tasks Completed
- [x] C1: MFA Challenge — refresh token now set as HttpOnly cookie, only AccessTokenResponse in body
- [x] C2: JWT bearer OnTokenValidated rejects tokens with purpose=mfa_challenge
- [x] H1: Recovery code comparison uses CryptographicOperations.FixedTimeEquals
- [x] H2: GenerateSetupAsync guards against MfaEnabled=true concurrent call
- [x] H3: BlacklistUserAsync moved after CommitTransactionAsync
- [x] H4: AcquireAsyncCore properly awaits ScriptEvaluateAsync
- [x] M2: Grace period cache strips RefreshToken before storing
- [x] M3: RedisService catches Exception (covers TimeoutException, ObjectDisposedException)
- [x] M4: MFA code DTOs have StringLength(8) validation
- [x] L1: RefreshToken RowVersion verified correct (IsConcurrencyToken + TIMESTAMP(6)) — no change needed
- [x] L2: ApiControllerBase now has GetUserId/GetIp/GetUserAgent/IsHttps; duplicates removed from both controllers
- [x] L3: IRedisService stays in Domain — Infrastructure has no Application reference (circular dependency would result); moving to Application would require adding a project reference

### Tests Status
- Type check: pass
- Build: **0 errors**, 1 pre-existing warning (xUnit1031 in CryptoRandomServiceTests, unrelated)

### Issues Encountered
- **L3 not applied**: Infrastructure → Application reference is absent and adding it would create layering violation (Application already has no infrastructure deps). IRedisService in Domain is actually acceptable since it has no framework dependencies. Skipped.

### Next Steps
- None — all applicable fixes implemented and build clean.
