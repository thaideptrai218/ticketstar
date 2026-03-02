# Phase 2: Frontend — Simplify MFA Components

## Overview
- **Priority:** High
- **Status:** Pending
- **Effort:** 2h
- **Depends on:** Phase 1 (new API contracts)
- Replace QR code setup wizard with simple "enter code from email" flow

## Key Insights
- Current `mfa-setup-wizard.tsx` (201 LOC) has 3 steps: QR → verify → recovery codes. New: 1 step (enter code)
- `security/page.tsx` (210 LOC) needs MFA status from new `GET /mfa/status` endpoint
- Challenge form (`mfa-challenge-form.tsx`) needs minor update: add "send OTP" step before code entry
- `auth-types.ts` MFA types need updating to match new DTOs

## Related Code Files

### Files to Modify
| File | Action | Description |
|------|--------|-------------|
| `lib/auth/auth-types.ts` | Modify | Update MFA request/response types |
| `lib/auth/auth-api-client.ts` | Modify | Update MFA API methods |
| `components/auth/mfa-setup-wizard.tsx` | **Rewrite** | Simple "enter email code" form |
| `components/auth/mfa-challenge-form.tsx` | Modify | Add "send code" step, remove recovery code input |
| `app/(app)/settings/security/page.tsx` | Modify | Fetch MFA status on load, add send-OTP for disable |
| `components/auth/recovery-codes-display.tsx` | **Delete** | No more recovery codes |

### Dependencies to Remove
- `react-qr-code` from package.json

## Implementation Steps

### 1. Update auth-types.ts
```typescript
// Remove: MfaSetupResponse (secret, qrCodeUri fields)
// Update:
export interface MfaSetupResponse { message: string }
export interface MfaStatusResponse { mfaEnabled: boolean }
export interface MfaSendOtpRequest { mfaToken: string }
// MfaChallengeRequest stays same shape (mfaToken + code)
// Remove: MfaVerifySetupResponse (recoveryCodes field)
```

### 2. Update auth-api-client.ts
```typescript
// Update methods:
setupMfa: (accessToken) => authFetch<MfaSetupResponse>("/mfa/setup", { method: "POST" }, accessToken)
verifyMfaSetup: (data: { code: string }, accessToken) => authFetch<void>("/mfa/verify-setup", ...)
sendChallengeOtp: (data: MfaSendOtpRequest) => authFetch<void>("/mfa/challenge/send", ...)
mfaChallenge: (data: MfaChallengeRequest) => authFetch<AccessTokenResponse>("/mfa/challenge/verify", ...)
sendDisableOtp: (accessToken) => authFetch<void>("/mfa/disable/send", { method: "POST" }, accessToken)
disableMfa: (data: { code: string }, accessToken) => authFetch<void>("/mfa/disable", ...)
getMfaStatus: (accessToken) => authFetch<MfaStatusResponse>("/mfa/status", {}, accessToken)
```

### 3. Rewrite mfa-setup-wizard.tsx
Simplify from 3-step wizard to 2-step:
1. **Confirm**: "We'll send a code to your email" → click "Send code" → calls `/mfa/setup`
2. **Verify**: Enter 6-digit code → calls `/mfa/verify-setup` → done

No QR code, no secret display, no recovery codes. ~80 LOC target.

### 4. Update mfa-challenge-form.tsx
Add "send OTP" before code entry:
1. On mount (or button click), call `sendChallengeOtp({ mfaToken })` to trigger email
2. Show "Mã xác thực đã được gửi đến email của bạn"
3. User enters code → calls `/mfa/challenge/verify`
4. Remove recovery code hint/input

### 5. Update security/page.tsx
- On mount: call `getMfaStatus(token)` → set `mfaEnabled` state (fixes issue #5)
- Disable flow: click "Tắt MFA" → call `sendDisableOtp` → enter code → call `disableMfa`
- Remove recovery codes section

### 6. Delete recovery-codes-display.tsx
No longer needed — email OTP has no recovery codes.

### 7. Remove react-qr-code
```bash
cd frontend && pnpm remove react-qr-code
```

## Todo List
- [ ] Update MFA types in auth-types.ts
- [ ] Update MFA methods in auth-api-client.ts
- [ ] Rewrite mfa-setup-wizard.tsx (simple email code flow)
- [ ] Update mfa-challenge-form.tsx (add send OTP step)
- [ ] Update security/page.tsx (fetch status, disable flow)
- [ ] Delete recovery-codes-display.tsx
- [ ] Remove react-qr-code dependency
- [ ] Verify TypeScript compiles clean

## Success Criteria
- MFA setup: user clicks "Enable" → receives code in email → enters code → done
- MFA challenge: login → OTP sent to email → enters code → authenticated
- MFA disable: user clicks "Disable" → receives code → enters code → done
- MFA status loads correctly on security settings page
- No references to QR code, recovery codes, authenticator app
- `npx tsc --noEmit` passes

## Security Considerations
- OTP codes shown only in dev console (backend handles this)
- No sensitive data (secrets, QR URIs) in frontend state
- Rate limiting enforced by backend
