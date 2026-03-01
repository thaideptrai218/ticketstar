# Auth API Reference — Frontend Team

> Base URL: `http://localhost:5010/api/auth`
>
> All auth endpoints use **httpOnly cookies** for refresh tokens. The frontend never handles refresh tokens directly.

## Quick Reference

| Endpoint              | Method | Auth | Rate Limit | Purpose              |
| --------------------- | ------ | ---- | ---------- | -------------------- |
| `/register`           | POST   | No   | 5/15min    | Create account       |
| `/login`              | POST   | No   | 10/5min    | Email login          |
| `/google-login`       | POST   | No   | —          | Google OAuth         |
| `/magic-link/request` | POST   | No   | 5/15min    | Request magic link   |
| `/magic-link/verify`  | POST   | No   | —          | Verify magic link    |
| `/refresh`            | POST   | No   | 30/5min    | Refresh access token |
| `/logout`             | POST   | Yes  | —          | Logout               |
| `/revoke-all`         | POST   | Yes  | —          | Revoke all sessions  |
| `/mfa/setup`          | POST   | Yes  | —          | Start MFA setup      |
| `/mfa/verify-setup`   | POST   | Yes  | —          | Complete MFA setup   |
| `/mfa/challenge`      | POST   | No   | 10/5min    | Complete MFA login   |
| `/mfa/disable`        | POST   | Yes  | —          | Disable MFA          |

**Auth = Yes** means include `Authorization: Bearer <accessToken>` header.

**Rate limits** are per IP. Exceeding returns `429 Too Many Requests` with `Retry-After` header.

---

## Authentication Endpoints

### Register

```
POST /api/auth/register
```

**Request:**

```json
{
    "email": "user@example.com",
    "password": "MySecurePass123",
    "fullName": "John Doe"
}
```

| Field    | Type   | Validation            |
| -------- | ------ | --------------------- |
| email    | string | Required, valid email |
| password | string | Required, 8-128 chars |
| fullName | string | Required              |

**Success (201):**

```json
{
    "accessToken": "eyJhbGciOiJIUzI1...",
    "expiresAt": "2026-03-01T12:10:00Z",
    "sessionId": "a1b2c3d4e5f6..."
}
```

Sets `refresh_token` httpOnly cookie automatically.

**Errors:**

| Status | Message                     | Cause           |
| ------ | --------------------------- | --------------- |
| 409    | "Email already registered." | Duplicate email |
| 400    | Validation errors           | Invalid input   |
| 429    | —                           | Rate limited    |

---

### Login

```
POST /api/auth/login
```

**Request:**

```json
{
    "email": "user@example.com",
    "password": "MySecurePass123"
}
```

**Success (200) — No MFA:**

```json
{
    "accessToken": "eyJhbGciOiJIUzI1...",
    "expiresAt": "2026-03-01T12:10:00Z",
    "sessionId": "a1b2c3d4e5f6..."
}
```

**Success (200) — MFA Required:**

```json
{
    "mfaToken": "eyJhbGciOiJIUzI1...",
    "mfaRequired": true
}
```

When `mfaRequired: true`, redirect user to MFA challenge screen. The `mfaToken` is valid for 5 minutes.

**Errors:**

| Status | Message                | Cause                                  |
| ------ | ---------------------- | -------------------------------------- |
| 401    | "Invalid credentials." | Wrong email/password or account locked |
| 429    | —                      | Rate limited                           |

> Account locks after 5 failed attempts (15min cooldown). Error message is intentionally vague to prevent enumeration.

---

### Google Login

```
POST /api/auth/google-login
```

**Request:**

```json
{
    "idToken": "eyJhbGciOiJSUzI1..."
}
```

| Field   | Type   | Validation                                                |
| ------- | ------ | --------------------------------------------------------- |
| idToken | string | Required, max 2048 chars. Google ID token from OAuth flow |

**Success:** Same as Login (AccessTokenResponse or MfaChallengeResponse).

**Errors:**

| Status | Message                                                                      | Cause                                 |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------- |
| 401    | "Google authentication failed."                                              | Invalid/expired token                 |
| 401    | "Email not verified with Google."                                            | Google email unverified               |
| 409    | "An account with this email exists. Please login with your original method." | Email exists but not linked to Google |

---

### Magic Link — Request

```
POST /api/auth/magic-link/request
```

**Request:**

```json
{
    "email": "user@example.com"
}
```

**Success (200):**

```json
{
    "message": "If the email exists, a magic link has been sent."
}
```

> Always returns 200 regardless of whether email exists (prevents enumeration). Link expires in 10 minutes.

---

### Magic Link — Verify

```
POST /api/auth/magic-link/verify
```

**Request:**

```json
{
    "token": "abc123..."
}
```

**Success:** Same as Login (AccessTokenResponse or MfaChallengeResponse).

**Errors:**

| Status | Message                       | Cause                           |
| ------ | ----------------------------- | ------------------------------- |
| 401    | "Invalid or used magic link." | Token not found or already used |
| 401    | "Magic link expired."         | Past 10min expiry               |

---

### Refresh Token

```
POST /api/auth/refresh
```

No request body needed. The `refresh_token` cookie is sent automatically by the browser.

**Success (200):**

```json
{
    "accessToken": "eyJhbGciOiJIUzI1...",
    "expiresAt": "2026-03-01T12:15:00Z",
    "sessionId": "a1b2c3d4e5f6..."
}
```

New `refresh_token` cookie is set automatically (rotation).

**Errors:**

| Status | Message                                   | Cause                                    |
| ------ | ----------------------------------------- | ---------------------------------------- |
| 401    | "Refresh token is required."              | No cookie present                        |
| 401    | "Token reuse detected. Sessions revoked." | Replay attack — all sessions invalidated |
| 401    | "Refresh token expired."                  | Token past 7-day expiry                  |
| 401    | "Account unavailable."                    | Account deleted or locked                |
| 401    | "Token already rotated. Please retry."    | Concurrency conflict                     |

**Multi-tab handling:** If two tabs refresh simultaneously, a 10-second grace window ensures both succeed. The first refresh rotates the token; the second gets a cached response.

---

### Logout

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

No request body. Clears `refresh_token` cookie.

**Success (200):**

```json
{
    "message": "Logged out successfully."
}
```

---

### Revoke All Sessions

```
POST /api/auth/revoke-all
Authorization: Bearer <accessToken>
```

Invalidates all active sessions and tokens immediately.

**Success (200):**

```json
{
    "message": "All sessions revoked."
}
```

> After this call, all existing access tokens are immediately rejected (via Redis blacklist). All clients must re-authenticate.

---

## MFA Endpoints

### Setup MFA

```
POST /api/auth/mfa/setup
Authorization: Bearer <accessToken>
```

**Success (200):**

```json
{
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUri": "otpauth://totp/TicketStar:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=TicketStar&algorithm=SHA1&digits=6&period=30",
    "qrCodeBase64": "iVBORw0KGgoAAAANSUh..."
}
```

**Frontend usage:**

- Display QR code: `<img src="data:image/png;base64,${qrCodeBase64}" />`
- Show `secret` as manual entry fallback
- After user scans QR, prompt for 6-digit verification code → call verify-setup

---

### Verify MFA Setup

```
POST /api/auth/mfa/verify-setup
Authorization: Bearer <accessToken>
```

**Request:**

```json
{
    "code": "123456"
}
```

**Success (200):**

```json
{
    "recoveryCodes": [
        "AB3KX7YZ",
        "CD9PQ2WR",
        "EF5LM8NT",
        "GH6RS4JV",
        "JK2WT9BC",
        "LM7XY3DF",
        "NP4ZA6GH",
        "QR8BN5KL"
    ]
}
```

> **IMPORTANT:** Display recovery codes to user and instruct them to save securely. These are shown only once and cannot be retrieved again.

**Errors:**

| Status | Message              | Cause                                   |
| ------ | -------------------- | --------------------------------------- |
| 401    | "Invalid TOTP code." | Wrong code or too far from current time |

---

### MFA Challenge (Login Step 2)

```
POST /api/auth/mfa/challenge
```

**Request:**

```json
{
    "mfaToken": "eyJhbGciOiJIUzI1...",
    "code": "123456"
}
```

The `code` can be either a 6-digit TOTP code or an 8-character recovery code.

**Success (200):**

```json
{
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "abc123...",
    "expiresAt": "2026-03-01T12:10:00Z",
    "sessionId": "a1b2c3d4e5f6..."
}
```

> Note: This endpoint currently returns `refreshToken` in the response body. Store it securely or discard it — the server will set the httpOnly cookie in a future update.

**Errors:**

| Status | Message                         | Cause                               |
| ------ | ------------------------------- | ----------------------------------- |
| 401    | "Invalid or expired MFA token." | mfaToken expired (5min) or tampered |
| 401    | "Invalid code."                 | Wrong TOTP/recovery code            |

---

### Disable MFA

```
POST /api/auth/mfa/disable
Authorization: Bearer <accessToken>
```

**Request:**

```json
{
    "code": "123456"
}
```

Accepts TOTP code or recovery code.

**Success (200):**

```json
{
    "message": "MFA disabled successfully."
}
```

**Errors:**

| Status | Message         | Cause      |
| ------ | --------------- | ---------- |
| 401    | "Invalid code." | Wrong code |

---

## Common Patterns

### Access Token Usage

Include in every authenticated request:

```typescript
fetch("/api/events", {
    headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    },
    credentials: "include", // required for cookies
});
```

### Token Refresh Strategy

Access tokens expire in **5 minutes**. Recommended approach:

```typescript
// Intercept 401 responses
async function fetchWithRefresh(url: string, options: RequestInit) {
    let response = await fetch(url, { ...options, credentials: "include" });

    if (response.status === 401) {
        // Try refreshing
        const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
        });

        if (refreshRes.ok) {
            const { accessToken } = await refreshRes.json();
            // Retry with new token
            options.headers = {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
            };
            response = await fetch(url, { ...options, credentials: "include" });
        } else {
            // Refresh failed — redirect to login
            window.location.href = "/login";
        }
    }

    return response;
}
```

### MFA Login Flow

```typescript
const loginRes = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
});

const data = await loginRes.json();

if (data.mfaRequired) {
    // Show MFA input screen
    // User enters TOTP code from authenticator app
    const mfaRes = await fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            mfaToken: data.mfaToken,
            code: userInputCode,
        }),
    });
    // Handle success/error
} else {
    // Login complete, store accessToken
}
```

### JWT Claims (Decoded)

```json
{
    "sub": "a1b2c3d4e5f6",
    "email": "user@example.com",
    "email_verified": "true",
    "role": "User",
    "sid": "d4e5f6a1b2c3",
    "sstamp": "ab12cd34",
    "jti": "unique-id",
    "exp": 1709294400,
    "iss": "TicketStar",
    "aud": "TicketStar"
}
```

Useful claims for frontend:

- `role` — for conditional UI (Admin, Organizer, Staff, User)
- `email_verified` — show verification banner if false
- `exp` — schedule token refresh before expiry

### Error Response Format

All error responses follow this structure:

```json
{
    "message": "Error description here."
}
```

For validation errors (400):

```json
{
    "errors": {
        "email": ["The Email field is required."],
        "password": ["The field Password must be between 8 and 128 characters."]
    }
}
```

### CORS Configuration

Frontend must send requests with `credentials: 'include'` for cookies to work. The backend CORS policy allows:

- Configured origins (from `Cors:AllowedOrigins`)
- Any method and header
- Credentials (cookies)

---

**Last Updated:** 2026-03-01
