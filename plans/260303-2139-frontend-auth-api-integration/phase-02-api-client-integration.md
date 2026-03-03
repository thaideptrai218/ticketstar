# Phase 02: API Client Integration

**Priority:** P1 (Critical path)
**Status:** Pending
**Estimated Effort:** 45 minutes
**Dependencies:** Phase 01

## Context Links

- Auth API reference: `docs/auth/frontend-api-reference.md`
- Existing auth client: `frontend/src/lib/auth/auth-api-client.ts`
- Auth types: `frontend/src/lib/auth/auth-types.ts`

## Overview

Verify that the existing auth API client works correctly with the backend API. Test each endpoint and handle edge cases (rate limiting, validation errors, MFA flows).

## Key Insights

1. **Auth Client Already Complete**: The `auth-api-client.ts` file implements all endpoints. Just needs testing.

2. **Backend Envelope**: Backend returns `{ success, data, error }` envelope. Already handled in `authFetch`.

3. **Token Refresh**: Automatic via `auth-context.tsx`. Verify it works with 401 responses.

4. **MFA Flow**: Login returns either `AccessTokenResponse` or `MfaChallengeResponse`. Type discriminator already implemented (`isMfaChallenge`).

## Requirements

### Functional Requirements
- Verify all auth endpoints work end-to-end
- Test token refresh on 401 responses
- Verify MFA flow (login → challenge → access token)
- Test Google OAuth redirect handling

### Non-Functional Requirements
- Handle rate limiting (429) gracefully
- Show user-friendly error messages (Vietnamese)
- Log errors for debugging

## Architecture

```
Component → AuthContext → AuthApiClient → Backend API
                ↓
         TokenManager (auto-refresh)
```

## Related Code Files

### Existing Files (Verify)
- `frontend/src/lib/auth/auth-api-client.ts` - All auth endpoints
- `frontend/src/lib/auth/auth-token-manager.ts` - Token storage
- `frontend/src/contexts/auth-context.tsx` - Auth state management
- `frontend/src/components/auth/login-form.tsx` - Login UI
- `frontend/src/components/auth/register-form.tsx` - Register UI
- `frontend/src/components/auth/mfa-challenge-form.tsx` - MFA UI

### Files to Create
- `frontend/src/lib/auth/auth-helpers.ts` - Helper functions for auth flows

### Files to Modify
- `frontend/src/components/auth/google-login-button.tsx` - Verify OAuth handling
- `frontend/.env.local` - Add API URL and Google Client ID

## Implementation Steps

1. **Environment Configuration**
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:5010
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

2. **Create Auth Helpers** (optional utility functions)
   ```typescript
   // frontend/src/lib/auth/auth-helpers.ts
   import { authApi, AuthApiError } from './auth-api-client';
   import type { LoginFormData, RegisterFormData } from './auth-types';

   export async function loginUser(data: LoginFormData) {
     try {
       const response = await authApi.login(data);
       return { success: true, data: response };
     } catch (error) {
       if (error instanceof AuthApiError) {
         // Handle rate limiting
         if (error.status === 429) {
           return { success: false, error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' };
         }
         return { success: false, error: error.message };
       }
       return { success: false, error: 'Đăng nhập thất bại.' };
     }
   }

   export async function registerUser(data: RegisterFormData) {
     try {
       const response = await authApi.register(data);
       return { success: true, data: response };
     } catch (error) {
       if (error instanceof AuthApiError) {
         if (error.status === 409) {
           return { success: false, error: 'Email đã được sử dụng.' };
         }
         return { success: false, error: error.message, fieldErrors: error.fieldErrors };
       }
       return { success: false, error: 'Đăng ký thất bại.' };
     }
   }
   ```

3. **Verify Token Refresh Flow**
   - The `auth-context.tsx` already handles refresh on mount
   - Verify 401 responses trigger refresh
   - Test with multiple tabs (grace period caching)

4. **Test Google OAuth**
   - Verify `google-login-button.tsx` uses `@react-oauth/google`
   - Test redirect flow: Google → token → backend login
   - Handle MFA requirement after OAuth

5. **Test Magic Link**
   - Verify request endpoint (always returns 200)
   - Test verify endpoint with valid token
   - Handle expired/used tokens

## Todo List

- [ ] Create `frontend/.env.local` with API URL
- [ ] Verify `auth-api-client.ts` endpoints match backend docs
- [ ] Test login flow (email/password)
- [ ] Test MFA flow (if user has MFA enabled)
- [ ] Test Google OAuth (if CLIENT_ID available)
- [ ] Test magic link request/verify
- [ ] Test token refresh (wait 5min or force expire)
- [ ] Test rate limiting (trigger 429)
- [ ] Verify error messages display in Vietnamese

## Success Criteria

- [ ] Login with email/password works
- [ ] MFA challenge displays when enabled
- [ ] Token refresh happens automatically
- [ ] Google OAuth redirects correctly
- [ ] Magic link sends email (verify in backend logs)
- [ ] Rate limiting shows user-friendly message
- [ ] Validation errors show field-level messages

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend not running | High | Start with `just infra && just backend` |
| CORS errors | Medium | Backend already configured, verify origins |
| Google OAuth not configured | Low | Skip if CLIENT_ID not available |
| Token refresh race condition | Low | Already handled by grace period |

## Security Considerations

- Verify `credentials: "include"` is set on all requests
- Check that httpOnly cookies work (access via DevTools → Application → Cookies)
- Never log tokens in console
- Clear tokens on logout

## Testing Checklist

### Happy Path
- [ ] Register new user → auto-login
- [ ] Login with correct credentials
- [ ] Login with MFA enabled → challenge → success
- [ ] Google OAuth → success
- [ ] Magic link → email → verify → login

### Error Cases
- [ ] Wrong password → 401 error
- [ ] Invalid email format → validation error
- [ ] Duplicate email → 409 error
- [ ] Expired magic link → 401 error
- [ ] Rate limit exceeded → 429 error
- [ ] Invalid MFA code → 401 error

### Edge Cases
- [ ] Token expiry during request → auto-refresh
- [ ] Multiple tabs refreshing → grace period
- [ ] Logout → cookies cleared → redirect to home

## Next Steps

Once API integration verified, proceed to **Phase 03: Dashboard Layout** to build protected UI.
