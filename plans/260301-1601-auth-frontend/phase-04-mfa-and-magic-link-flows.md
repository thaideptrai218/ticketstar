# Phase 4: MFA Challenge & Magic Link Flows

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 2.5h

Complete MFA challenge (already started in phase 3) and magic link request/verify flow.

## Context Links
- [Phase 3](/plans/260301-1601-auth-frontend/phase-03-login-and-register-pages.md)
- [Magic link API](/docs/auth/frontend-api-reference.md#magic-link--request)

## Requirements

### Functional
- Magic link request form on login page (tab or toggle)
- `/magic-link/verify?token=xxx` page — auto-verifies on load
- Success → redirect to home; MFA → show challenge; error → show message with retry
- Toast notifications for magic link sent confirmation

## Related Code Files

### Create
- `frontend/src/components/auth/magic-link-request-form.tsx`
- `frontend/src/app/(auth)/magic-link/verify/page.tsx`

### Modify
- `frontend/src/components/auth/login-form.tsx` — add magic link tab/toggle

## Implementation Steps

1. Create `magic-link-request-form.tsx`:
   - Email input + submit
   - On success: show "Chung toi da gui link dang nhap den email cua ban" message
   - No error revealed if email doesn't exist (API always returns 200)

2. Create `magic-link/verify/page.tsx`:
   - Read `token` from searchParams
   - On mount: call `verifyMagicLink(token)`
   - States: verifying (spinner) → success (redirect) → mfa (show challenge) → error (message + link to login)
   - Handle MFA response inline

3. Update `login-form.tsx`:
   - Add tab or link: "Dang nhap bang magic link" toggles between password form and magic link form

## Todo List
- [ ] Create magic-link-request-form
- [ ] Create magic-link verify page
- [ ] Integrate magic link option into login page
- [ ] Handle MFA after magic link verify

## Success Criteria
- Magic link request shows confirmation regardless of email existence
- Verify page auto-completes auth on valid token
- MFA works after magic link verify
- Expired/invalid tokens show clear error
