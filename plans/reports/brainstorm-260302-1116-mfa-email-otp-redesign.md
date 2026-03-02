# Brainstorm: MFA Redesign — TOTP → Email OTP

**Date:** 2026-03-02
**Decision:** Replace TOTP authenticator app MFA with Email OTP
**Status:** Agreed, pending implementation plan

## Problem
TOTP MFA creates too much friction for a ticketing platform — requires app install, QR scanning, recovery code management. MFA is optional for all roles, so UX should be prioritized.

## Evaluated Approaches

| Approach | Verdict |
|----------|---------|
| **Email OTP** | **Selected** — minimal friction, reuses email infra, no extra dependencies |
| SMS OTP | Rejected — costs money, SS7 vulnerabilities, needs Twilio |
| Passkeys/WebAuthn | Overkill for now — consider for admin roles later |
| Keep TOTP + email fallback | Unnecessary complexity for optional MFA |

## Solution: Email OTP

### Backend
- `EmailOtpService` replaces `MfaService` — 6-digit code, Redis-stored hash (5min TTL)
- Remove: `MfaCryptoHelper`, `MfaRecoveryCode` entity, `MfaOptions.EncryptionKey`, `User.MfaSecret`
- Keep: `User.MfaEnabled`, same endpoint paths
- Email delivery: log-based (same as magic link), real SMTP later
- Rate limiting: 1 OTP per 60s per user

### Frontend
- Remove QR code setup wizard → simple "enter code from email" flow
- Remove `react-qr-code` dependency
- Setup: toggle → verify email code → done
- Challenge: same form, simpler copy

### What gets deleted
- `MfaCryptoHelper.cs` (~117 LOC)
- `MfaRecoveryCode.cs` entity
- `MfaRecoveryCodeRepository.cs`
- QR code generation logic in `MfaService`
- `react-qr-code` frontend dependency
- `OtpNet`, `QRCoder` NuGet packages

### Trade-offs accepted
- No offline MFA (acceptable — ticketing is online-only)
- Lower phishing resistance (same as TOTP honestly)
- Email deliverability dependency (mitigated: log-based for now)

## Next Steps
- Create implementation plan with phases
- Backend: new EmailOtpService + migration to remove MfaSecret/MfaRecoveryCode
- Frontend: simplify MFA components
