# Auth Architecture Research: Industry Patterns 2025-2026

**Date:** 2026-02-28
**Context:** TicketStar custom auth — JWT 15min access + 7-day refresh, Redis + MySQL, .NET API

---

## 1. Supabase Auth Architecture

**Stack:** GoTrue (Go) fork → Postgres `auth` schema. No Redis.

- **Storage:** All session data in Postgres `auth.sessions` table. No separate cache layer.
- **Access token:** JWT, configurable 5min–1hr (default 1hr)
- **Refresh token:** Opaque string, never expires, single-use
- **Rotation:** Exchange refresh → new access+refresh pair atomically. Reuse interval: 10s (grace for race conditions / multi-tab)
- **Reuse detection:** If stale refresh token reused outside reuse interval → revoke entire session family
- **Client-side storage:** localStorage (browser) + HttpOnly cookies (SSR/server-side)
- **Session table:** tracks per-device sessions; termination on password change, explicit logout, inactivity timeout, max lifetime

**Key decision:** Postgres-only (no Redis). Works at their scale because refresh token exchange is infrequent. Access token validation is stateless JWT — no DB hit needed per request.

---

## 2. Clerk Auth Architecture

**Stack:** Proprietary SaaS. Dual-token strategy.

- **`__client` cookie:** HttpOnly, Secure, long-lived. Stored on FAPI (Frontend API) domain. Acts as session reference — server-side truth.
- **`__session` cookie:** Short-lived JWT (60 seconds). Client-readable. Encodes session object directly — no DB lookup needed per request.
- **Refresh mechanism:** SDK polls `/client/sessions/<id>/tokens` on 50-second interval (10s buffer). New JWT minted every 60s if user is active.
- **Inactivity:** If no interaction >60s → no new token minted → session goes stale naturally
- **Revocation latency:** Up to 60s window where a deleted session's JWT still validates. Accepted tradeoff for performance.
- **Multi-session:** One `__client` can hold multiple active sessions (different accounts)

**Key insight:** Clerk solved the "revocation vs stateless" tension by making JWTs 60s TTL + server-side session as truth. The short TTL makes revocation lag acceptable (max 60s exposure vs traditional 15min-1hr JWT).

---

## 3. Firebase Auth Architecture

**Two distinct session models:**

### Model A: Client-side (default)
- ID token: JWT, 1-hour TTL
- Refresh token: Long-lived opaque token stored client-side
- Client SDK auto-refreshes ID token before expiry
- No server-side session tracking

### Model B: Session Cookies (server-side)
- Admin SDK mints a session cookie from ID token
- Cookie TTL: configurable 5min–2 weeks
- Same JWT claims as ID token (including custom claims)
- Revocation: Admin SDK can revoke refresh tokens, invalidating session cookie generation
- Advantage: Server controls session lifecycle; no client-side token exposure

**Key decision:** Firebase offers both patterns. For traditional web apps (SSR), session cookie model is recommended — avoids client-side token exposure entirely.

---

## 4. Redis vs DB for Token Storage (2025 Best Practice)

### When DB-only is fine (Supabase approach)
- Refresh tokens only queried on rotation (infrequent, not per-request)
- Access token validation is stateless JWT → zero DB hits per request
- Simple architecture, fewer failure modes
- Acceptable for most apps up to significant scale

### When Redis wins
- High-frequency token lookups (opaque access tokens requiring server-side validation per request)
- Session blacklisting at scale (revoked JWT lookup)
- Distributed locking for atomic refresh rotation under high concurrency
- Sub-millisecond latency requirements for auth middleware

### Hybrid (current best practice for scale)
- **Redis:** Access token short-term validation cache, session blacklist, refresh token atomic operations
- **DB:** Persistent session records, audit trail, user-session relationships
- Pattern: Write to DB as truth, cache in Redis with TTL matching token lifetime

### TicketStar relevance
Project already uses Redis for distributed locking (ticket overselling). Using Redis for refresh token atomic operations + access token revocation blacklist is consistent with existing architecture.

---

## 5. Modern Auth Patterns 2025-2026

### Refresh Token Rotation — Still Best Practice
- Still the standard. No replacement emerged.
- Key addition: **reuse detection** (Supabase/Auth0 model) — stale token reuse triggers full session family revocation
- Atomic rotation critical: must be single DB/Redis transaction to prevent race conditions
- Multi-tab problem: Supabase's 10s reuse interval is the pragmatic solution

### Passkeys/WebAuthn — Mainstream in 2025
- **69% of users** now have at least one passkey (FIDO Alliance, May 2025)
- **48% of top 100 websites** support passkeys (2x growth since 2022)
- 93% login success rate vs 63% for passwords
- Apple 2025: passkey-first signup APIs, automatic upgrades for existing users
- TikTok: 97% success rate; Google: 4x more successful than passwords
- Market: $24.1B in 2025, projected $55.7B by 2030
- **Verdict:** Passkeys are now table-stakes for new auth systems, not experimental

### BFF (Backend-for-Frontend) — Becoming Standard for SPAs
- IETF draft recommends BFF as the preferred SPA auth pattern
- Browser never sees tokens; BFF holds tokens server-side, issues HttpOnly session cookie to browser
- Eliminates XSS token theft entirely
- Adopted by: Duende, FusionAuth, Curity (Token Handler Pattern)
- Trade-off: adds server component, no longer purely static SPA

### Short-lived JWT + HttpOnly Cookies Trend
- Pattern: access token in memory (JS variable, not storage) OR HttpOnly cookie
- Refresh token: HttpOnly cookie only (never accessible to JS)
- Clerk's 60s JWT is the extreme version; 5-15min is more common
- Significant shift away from localStorage (now considered anti-pattern for tokens)

### Token-less Session Approaches
- Traditional server-side sessions (express-session + Redis) seeing revival for sensitive apps
- Firebase session cookies model resurgence for SSR apps
- Opaque session ID in HttpOnly cookie → server lookup → no token parsing overhead
- Trade-off: stateful, requires sticky sessions or distributed session store

### DPoP (Demonstration of Proof-of-Possession)
- Emerging: cryptographically binds tokens to client's private key
- Prevents token replay even if stolen
- OWASP now recommends DPoP or sender-constrained tokens for high-security scenarios
- Adoption still limited; primarily OAuth server-to-server

---

## 6. Common Pitfalls (What Providers Solved)

| Pitfall | Problem | Provider Solution |
|---------|---------|-------------------|
| **Refresh race condition** | Multi-tab/parallel requests all try to refresh simultaneously → only first succeeds, others fail | Supabase: 10s reuse interval; Clerk: 60s JWT TTL with active polling |
| **JWT revocation** | Stateless JWT can't be invalidated before expiry | Clerk: 60s TTL makes revocation lag acceptable; Firebase: session cookies with server control |
| **localStorage XSS** | Tokens in localStorage accessible to any JS → XSS steals tokens | Industry consensus: HttpOnly cookies or memory-only storage |
| **Refresh token theft** | Attacker steals refresh token, silently gets new access tokens | Rotation + reuse detection: stale token use triggers full session revocation |
| **Token storage location** | Where does refresh token live on client? | HttpOnly cookie (not localStorage); BFF pattern eliminates client-side token entirely |
| **Session proliferation** | Users accumulate sessions across devices with no visibility | Per-device session tracking (Supabase `auth.sessions`), user-visible session management |
| **Atomic rotation** | Non-atomic refresh invalidation creates window where both old+new tokens valid | DB transaction or Redis atomic operation (GETSET/Lua script) for rotation |
| **Clock skew** | Token appears expired on server due to clock drift | Standard: 30–60s clock skew tolerance in JWT validation |
| **Supply chain token theft** | Stolen OAuth tokens bypass MFA (Salesloft/Drift 2025 incident) | Anomaly detection on refresh token usage (geolocation, timing patterns) |

---

## Recommendations for TicketStar

Given existing stack (JWT 15min access + 7-day refresh, Redis + MySQL):

1. **Current 15min access TTL** is reasonable. Clerk's 60s is overkill for non-SaaS. Supabase's 1hr is too long.
2. **Refresh token reuse interval** — add 10–30s grace window to handle multi-tab race conditions
3. **Rotation must be atomic** — use Redis SETNX or DB transaction. Currently unclear if this is implemented.
4. **Reuse detection** — stale refresh token usage should revoke all sessions for that user
5. **HttpOnly cookies** for refresh tokens in browser clients — current guide says "prefer httpOnly cookies" but needs enforcement
6. **Redis blacklist** for access token revocation — allows immediate session termination without waiting for 15min expiry
7. **Passkeys** — not urgent now, but plan for it. FIDO2/WebAuthn library integration point should be considered in auth schema.
8. **BFF** — if building a React/Next.js frontend, consider BFF pattern to eliminate client-side token exposure entirely

---

## Unresolved Questions

1. Is the current refresh token rotation atomic in TicketStar? (Redis SETNX or DB transaction?)
2. Is there a reuse detection mechanism — does stale refresh token usage trigger full session revocation?
3. Are refresh tokens stored as HttpOnly cookies or returned in response body (requiring client to store)?
4. Is there a per-device session table or just single active refresh token per user?
5. What's the revocation story for access tokens — is there a Redis blacklist, or must wait for 15min expiry?

---

## Sources

- [Supabase Auth Architecture](https://supabase.com/docs/guides/auth/architecture)
- [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Clerk: How We Roll — Sessions](https://clerk.com/blog/how-we-roll-sessions)
- [Clerk Session Tokens](https://clerk.com/docs/guides/sessions/session-tokens)
- [Firebase Manage Session Cookies](https://firebase.google.com/docs/auth/admin/manage-cookies)
- [Firebase Manage User Sessions](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Redis Authentication Token Storage](https://redis.io/solutions/authentication-token-storage/)
- [BFF Pattern — Auth0](https://auth0.com/blog/the-backend-for-frontend-pattern-bff/)
- [Token Handler Pattern — Curity](https://curity.io/resources/learn/the-token-handler-pattern/)
- [Passkeys Mainstream 2025 — AuthSignal](https://www.authsignal.com/blog/articles/passwordless-authentication-in-2025-the-year-passkeys-went-mainstream)
- [OAuth Browser-Based Apps IETF Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [Refresh Token Security — Auth0](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
- [Refresh Token Rotation Analysis — Ping Identity](https://www.pingidentity.com/en/resources/blog/post/refresh-token-rotation-spa.html)
