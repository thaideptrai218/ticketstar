# Phase 1: Auth API Client & Types

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 1.5h

Create TypeScript types, Zod validation schemas, and API client functions for all auth endpoints.

## Context Links
- [Auth API Reference](/docs/auth/frontend-api-reference.md)
- [Plan](/plans/260301-1601-auth-frontend/plan.md)

## Key Insights
- All requests need `credentials: "include"` for httpOnly cookies
- Error responses: `{ message }` or `{ errors: { field: string[] } }` for validation
- Login/google-login/magic-link-verify can return AccessTokenResponse OR MfaChallengeResponse
- Access token 5min expiry, refresh token 7d in httpOnly cookie

## Requirements

### Functional
- Type-safe request/response types for all 12 auth endpoints
- Zod schemas for form validation (register, login, mfa-challenge)
- API client functions with proper error handling
- Discriminated union for login responses (access token vs MFA required)

### Non-functional
- Files <200 LOC each
- Consistent error extraction helper

## Related Code Files

### Create
- `frontend/src/lib/auth/auth-types.ts` — types + zod schemas
- `frontend/src/lib/auth/auth-api-client.ts` — fetch wrappers

## Implementation Steps

1. Create `auth-types.ts`:
   - `LoginRequest`, `RegisterRequest`, `GoogleLoginRequest`, `MagicLinkRequest`, `MagicLinkVerifyRequest`, `MfaChallengeRequest`, `MfaVerifySetupRequest`, `MfaDisableRequest`
   - `AccessTokenResponse`, `MfaChallengeResponse`, `LoginResponse` (discriminated union via `mfaRequired`)
   - `MfaSetupResponse`, `MfaVerifySetupResponse`
   - `AuthErrorResponse`, `ValidationErrorResponse`
   - Zod schemas: `loginSchema`, `registerSchema`, `mfaChallengeSchema`

2. Create `auth-api-client.ts`:
   - `AUTH_BASE_URL = "http://localhost:5010/api/auth"`
   - Helper: `authFetch<T>(endpoint, options)` — wraps fetch with credentials, JSON headers, error extraction
   - Helper: `extractAuthError(response)` — returns string message from either error format
   - Functions: `register()`, `login()`, `googleLogin()`, `requestMagicLink()`, `verifyMagicLink()`, `refreshToken()`, `logout()`, `revokeAll()`, `setupMfa()`, `verifyMfaSetup()`, `mfaChallenge()`, `disableMfa()`
   - Each function takes typed request, returns typed response

## Todo List
- [ ] Create auth-types.ts with all request/response types
- [ ] Create zod schemas for form validation
- [ ] Create auth-api-client.ts with fetch wrappers
- [ ] Create error extraction helper
- [ ] Verify types match API reference exactly

## Success Criteria
- All 12 endpoints have typed wrappers
- Zod schemas validate form inputs client-side
- Error responses properly parsed into user-friendly messages
- Files compile without errors
