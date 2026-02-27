# Auth API Guide — Frontend Integration

**Base URL:** `http://localhost:5010` (dev) | TBD (prod)
**Content-Type:** `application/json`

---

## Overview

TicketStar uses JWT-based auth with short-lived access tokens (15 min) and long-lived refresh tokens (7 days). Store both tokens securely — never in `localStorage` for production (prefer `httpOnly` cookies or secure memory).

### Token Lifecycle

```
Register / Login / Google OAuth / Magic Link
        ↓
  { accessToken, refreshToken, expiresAt, sessionId }
        ↓
Use accessToken in Authorization header for all protected requests
        ↓
When accessToken expires → call /refresh with refreshToken
        ↓
Logout → call /logout to revoke the session
```

### JWT Claims

Decoded `accessToken` contains:

| Claim | Value | Example |
|-------|-------|---------|
| `sub` | User ID (GUID string) | `"dc9829cd-c5b3-..."` |
| `email` | User email | `"user@example.com"` |
| `email_verified` | Email verified status | `"true"` / `"false"` |
| `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` | User role | `"User"` / `"Admin"` / `"Organizer"` / `"Staff"` |
| `sid` | Session ID | `"fa4022c3d8..."` |
| `sstamp` | Security stamp prefix (8 chars) | `"9d21c561"` |
| `exp` | Expiry (Unix timestamp) | `1772190330` |

**Tip:** Use a JWT decode library (e.g. `jwt-decode`) to read claims without verification on the client side.

---

## Endpoints

### POST `/api/auth/register`

Create a new account. Returns tokens immediately (no email verification required to start).

**Request:**
```json
{
  "email": "user@example.com",
  "password": "MyPass@123",
  "fullName": "Jane Doe"
}
```

**Validation:**
- `email` — valid email format
- `password` — minimum 8 characters
- `fullName` — required

**Response `200`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "QjGbhVCb...",
  "expiresAt": "2026-02-27T16:05:30Z",
  "sessionId": "fa4022c3d83749..."
}
```

**Errors:**
| Status | Reason |
|--------|--------|
| `409` | Email already registered |
| `400` | Validation failed |

---

### POST `/api/auth/login`

Email + password login.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "MyPass@123"
}
```

**Response `200`:** Same as Register response.

**Errors:**
| Status | Reason |
|--------|--------|
| `401` | `"Invalid credentials."` — wrong email, wrong password, or locked account (intentionally same message) |

> **Security note:** After 5 failed attempts the account locks for 15 minutes. The error message is identical to a wrong-password error — do not try to distinguish them.

---

### POST `/api/auth/google-login`

Authenticate using a Google ID token obtained from the Google OAuth flow.

**Request:**
```json
{
  "idToken": "<google_id_token_from_oauth_flow>"
}
```

**Response `200`:** Same as Register response.

**Errors:**
| Status | Reason |
|--------|--------|
| `401` | Invalid token, unverified email, or account exists with a different login method |

> **Important:** If an account already exists with the same email but was registered via email/password, Google login will be rejected. Users must log in with their original method. Silent account merging is not supported.

---

### POST `/api/auth/magic-link/request`

Request a passwordless magic link for the given email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response `200`:** Always succeeds (even for unknown emails — prevents email enumeration).
```json
{
  "message": "If the email exists, a magic link has been sent."
}
```

> **Dev note:** Email sending is not yet implemented. The magic link token is printed to the API console logs. Look for: `Magic link issued for {email}, hash prefix: ...`

**Rate limit:** 5 requests per 15 minutes per IP.

---

### POST `/api/auth/magic-link/verify`

Exchange a magic link token for auth tokens.

**Request:**
```json
{
  "token": "<token_from_magic_link_url>"
}
```

**Response `200`:** Same as Register response.

**Errors:**
| Status | Reason |
|--------|--------|
| `401` | Token invalid, already used, or expired (10 min TTL) |

> Each magic link can only be used **once**. Magic links also auto-verify the user's email on first use.

---

### POST `/api/auth/refresh`

Exchange a refresh token for a new access token + new refresh token. The old refresh token is immediately revoked.

**Request:**
```json
{
  "refreshToken": "<current_refresh_token>"
}
```

**Response `200`:** Same as Register response (new tokens).

**Errors:**
| Status | Reason |
|--------|--------|
| `401` | Token expired, revoked, or invalid |
| `401` | `"Token reuse detected. Sessions revoked."` — attempting to reuse an old refresh token revokes the entire token family |

> **Important — Token Rotation:** Every refresh issues a new `refreshToken`. Always store the latest one. If you use an old refresh token (e.g. from a tab that was open during a previous refresh), **all sessions for that token chain are immediately revoked** as a security measure.

---

### POST `/api/auth/logout`

🔒 **Requires:** `Authorization: Bearer <accessToken>`

Revoke the current session and refresh token.

**Request:**
```json
{
  "refreshToken": "<current_refresh_token>"
}
```

**Response `200`:**
```json
{
  "message": "Logged out successfully."
}
```

---

### POST `/api/auth/revoke-all`

🔒 **Requires:** `Authorization: Bearer <accessToken>`

Revoke all active sessions across all devices. Use for "sign out everywhere" functionality.

**Request:** No body required.

**Response `200`:**
```json
{
  "message": "All sessions revoked."
}
```

> After calling this, the current `accessToken` remains valid until it expires (max 15 min) but all refresh tokens are immediately invalidated. Any subsequent `/refresh` calls will fail.

---

## Authorization Header

All protected endpoints require:

```
Authorization: Bearer <accessToken>
```

---

## Recommended Frontend Flow

### On App Start
```
1. Read stored accessToken + refreshToken
2. Check if accessToken is expired (decode exp claim)
3. If expired → call /refresh → store new tokens
4. If refresh fails → clear tokens → redirect to login
```

### On API Request (401 Response)
```
1. Attempt /refresh with stored refreshToken
2. If refresh succeeds → retry original request with new accessToken
3. If refresh fails → clear tokens → redirect to login
```

### Token Storage
- **Recommended (prod):** `httpOnly` cookies set by the server (prevents XSS)
- **Acceptable (dev/SPA):** In-memory state (lost on page refresh, but safe from XSS)
- **Avoid:** `localStorage` or `sessionStorage` (vulnerable to XSS)

---

## User Roles

| Role | Value in JWT | Description |
|------|-------------|-------------|
| `User` | `"User"` | Default registered user / ticket buyer |
| `Staff` | `"Staff"` | Event staff (check-in, scanning) |
| `Organizer` | `"Organizer"` | Event organizer |
| `Admin` | `"Admin"` | Full system access |

---

## Error Response Shape

All errors return:
```json
{
  "error": "Human-readable error message"
}
```

---

## TypeScript Types

```typescript
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO 8601 datetime
  sessionId: string;
}

interface AuthError {
  error: string;
}

// JWT payload (decoded, not verified on client)
interface JwtPayload {
  sub: string;           // userId
  email: string;
  email_verified: string; // "true" | "false"
  // role claim uses the full schema URI:
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  sid: string;           // sessionId
  sstamp: string;        // security stamp prefix
  exp: number;           // Unix timestamp
}

type UserRole = "User" | "Staff" | "Organizer" | "Admin";
```

---

## Quick Reference

| Endpoint | Auth | Body fields |
|----------|------|-------------|
| `POST /api/auth/register` | No | `email`, `password`, `fullName` |
| `POST /api/auth/login` | No | `email`, `password` |
| `POST /api/auth/google-login` | No | `idToken` |
| `POST /api/auth/magic-link/request` | No | `email` |
| `POST /api/auth/magic-link/verify` | No | `token` |
| `POST /api/auth/refresh` | No | `refreshToken` |
| `POST /api/auth/logout` | **Yes** | `refreshToken` |
| `POST /api/auth/revoke-all` | **Yes** | _(none)_ |
