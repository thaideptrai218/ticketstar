# Phase 6: MFA Setup Page (Settings)

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 1.5h

Settings page for MFA setup/disable. Protected route.

## Context Links
- [MFA API](/docs/auth/frontend-api-reference.md#mfa-endpoints)
- [Phase 5](/plans/260301-1601-auth-frontend/phase-05-protected-routes-and-layout.md)

## Requirements

### Functional
- Security settings page at `/settings/security`
- If MFA disabled: "Bat MFA" button → setup wizard (QR code → verify → show recovery codes)
- If MFA enabled: "Tat MFA" button → confirm with TOTP code
- Recovery codes shown once after setup, user must save them

## Related Code Files

### Create
- `frontend/src/components/auth/mfa-setup-wizard.tsx` — multi-step: QR → verify → recovery codes
- `frontend/src/components/auth/recovery-codes-display.tsx` — shows codes with copy button
- `frontend/src/app/(app)/settings/security/page.tsx`

## Implementation Steps

1. Create `mfa-setup-wizard.tsx`:
   - Step 1: Call `/mfa/setup`, show QR code image + secret text
   - Step 2: 6-digit verification input → call `/mfa/verify-setup`
   - Step 3: Show recovery codes from response
   - Back button between steps

2. Create `recovery-codes-display.tsx`:
   - Grid of 8 codes
   - "Sao chep" (copy) button copies all codes
   - Warning: "Luu cac ma nay o noi an toan. Ban se khong the xem lai chung."

3. Create `settings/security/page.tsx`:
   - Card showing MFA status
   - Toggle between setup wizard and disable form
   - Disable: requires TOTP code confirmation

## Todo List
- [ ] Create mfa-setup-wizard (3-step flow)
- [ ] Create recovery-codes-display
- [ ] Create security settings page
- [ ] Add MFA disable with code confirmation

## Success Criteria
- Users can enable MFA via QR code scan + verification
- Recovery codes displayed clearly with copy functionality
- Users can disable MFA with TOTP confirmation
- All states (enabled/disabled) display correctly

## Security Considerations
- Recovery codes shown only once — clear from state after user dismisses
- Disable MFA requires active TOTP code (not just being logged in)
