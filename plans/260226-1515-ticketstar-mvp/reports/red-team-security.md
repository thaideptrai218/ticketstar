# Red Team Security Review — TicketStar MVP Plan

**Date:** 2026-02-26 | **Severity:** Multiple Critical & High issues identified

---

## Finding 1: No CSRF Protection on State-Changing Operations

- **Severity:** Critical
- **Location:** Phase 3 ("Backend API"), Phase 4 ("Frontend Auth & Layout")
- **Flaw:** Plan specifies `sameSite: lax` cookies for CSRF, but does NOT mention CSRF tokens (double-submit, SameSite-strict, or header validation). httpOnly cookies prevent XSS theft, but do NOT prevent CSRF if an attacker can trick the user's browser into making a request from a malicious origin.
- **Failure scenario:** Attacker creates a fake ticket resale site. User logs into TicketStar, then visits attacker's site. Attacker's page includes `<form action="https://ticketstar.api/orders/{evilOrderId}/pay" method="POST">`, auto-submits it. Browser includes httpOnly cookie, payment processes, attacker steals order outcome.
- **Evidence:** Phase 4 specifies "sameSite=lax" as the ONLY CSRF mechanism. Phase 3 makes no mention of X-CSRF-Token header validation or explicit CSRF token verification.
- **Suggested fix:** Add explicit CSRF token validation:
  - Generate token per session, embed in form state
  - Require `X-CSRF-Token` header on all mutations (POST/PUT/DELETE)
  - Validate token matches session before processing
  - OR: Use `sameSite: strict` (breaks legitimate cross-origin clicks); `lax` alone is insufficient

---

## Finding 2: Magic Link Token Reuse & Enumeration Attack

- **Severity:** Critical
- **Location:** Phase 2 ("Database & Identity"), section "Magic Link Tokens"
- **Flaw:** Plan states magic link tokens expire in 10 minutes and are "single-use," but provides NO rate limiting on requests. An attacker can:
  1. Request magic link for any email (no rate limit mentioned)
  2. Brute-force the token space if tokens are short or sequential
  3. Enumerate valid emails by timing response differences (magic link request vs invalid email)
- **Failure scenario:**
  - Attacker requests magic links for 1000 emails overnight (no rate limit)
  - Discovers which emails are registered
  - Uses those emails for targeted social engineering
  - OR: Brute-forces a 6-digit token in seconds if not cryptographically random enough
- **Evidence:** Phase 2 says "generate token" (no size spec), "save to DB", "publish email event", but does NOT mention rate limiting, token entropy requirements, or enumeration protection.
- **Suggested fix:**
  - Rate limit magic link requests per email: max 1 per 60s per email
  - Use 32+ random bytes (base64) for token (current plan ambiguous on size)
  - Do NOT return different HTTP status for "email not registered" vs "email registered but error"
  - Return same response for both (email would be sent if registered)

---

## Finding 3: No Input Validation on Order/Ticket Type Creation

- **Severity:** High
- **Location:** Phase 3 ("Backend API"), section "Orders API" & "Ticket Types API"
- **Flaw:** Plan specifies DTO definitions (`CreateOrderRequest`, `CreateTicketTypeRequest`) but provides NO validation rules. Without validation:
  - Negative quantities in order items accepted (exploits quota system)
  - Negative prices accepted (gives tickets away or creates refund confusion)
  - Extremely large quota values overflow limits
  - HTML/SQL injection in event description, ticket names
- **Failure scenario:** Attacker sends `{ quantity: -1000 }` in order, quota check passes (remaining >= -1000 is always true), then ticket lock is never released. Quota counter corrupted. OR: sends `quantity: 2147483647`, overflows integer, passes validation, triggers backend crash.
- **Evidence:** Phase 3 says "Input validation on all DTOs (FluentValidation or DataAnnotations)" in Security Considerations, but provides ZERO specification of actual validation rules in the Implementation Steps.
- **Suggested fix:**
  - Explicitly list validation rules per DTO (e.g., `quantity: min 1, max 100; price: min 0.01, max 999999.99`)
  - Implement server-side validation (not reliant on client)
  - Add unit tests for boundary conditions

---

## Finding 4: Ticket Transfer DoS via No Rate Limiting

- **Severity:** High
- **Location:** Phase 3 ("Backend API"), Phase 6 ("Frontend Attendee"), section "Ticket Transfer"
- **Flaw:** Plan allows ticket transfers but mentions rate limiting only in "Risk Assessment" as a vague note: "backend should rate-limit transfers." No actual rate limit is specified in the transfer endpoint design.
- **Failure scenario:** Attacker buys one ticket for a high-demand event. Transfers it to user A (generates new QR). Transfers same ticket ID to user B (violates state — ticket already transferred). Or: creates a bot that transfers the same ticket 100,000 times per minute, causing DB bloat and QR regeneration DoS, consuming all HMAC key compute cycles.
- **Evidence:** Phase 6, "Risk Assessment" mentions "Transfer abuse: backend should rate-limit transfers" but Implementation Steps do NOT include rate limit spec.
- **Suggested fix:**
  - Specify rate limit in transfer endpoint: max 5 transfers per ticket per 24 hours
  - Add global rate limit: max 10 transfers per user per minute
  - Validate ticket is not already transferred (idempotency check)

---

## Finding 5: QR Code HMAC Validation Lacks Key Rotation & Versioning

- **Severity:** High
- **Location:** Phase 3 ("Backend API"), section "QR Code Service"
- **Flaw:** Plan specifies HMAC-SHA256 signed QR with payload, but the HMAC key is stored in `appsettings.json` with no rotation mechanism. If key is leaked or becomes compromised:
  - Attacker can forge any QR code (sign arbitrary ticketId + eventId + userId)
  - Attacker can check in to any event, impersonating any attendee
  - No way to revoke compromised keys without re-issuing all tickets
- **Failure scenario:** A disgruntled staff member or AWS secret exposure leaks the QR HMAC key. Attacker generates fake QR codes for all tickets to free concerts. All check-ins become invalid until key is rotated. But rotation requires re-generating and re-issuing 10,000+ tickets.
- **Evidence:** Phase 3 says "QR: HMAC-signed payload" and "Secret key from config (QR:HmacSecret)". Risk Assessment mentions "QR HMAC key rotation — store key version in QR data for future rotation support" as a note, but does NOT mandate versioning in the initial implementation.
- **Suggested fix:**
  - Store key version in QR data (e.g., `v=1|signature|payload`)
  - Include `keyVersion` in HMAC validation
  - Plan key rotation process: new HMAC key generated, old tickets regenerated with new key before old key expires
  - Mandate this in MVP (not "future rotation support")

---

## Finding 6: Staff Assignment Privilege Escalation

- **Severity:** High
- **Location:** Phase 3 ("Backend API"), section "Staff API"
- **Flaw:** Plan states `POST /api/events/{eventId}/staff` is "Organizer only" to assign staff. But plan does NOT specify:
  - Can an organizer assign themselves as staff to bypass organizer role permission checks?
  - Can an organizer assign a non-existent user to staff (fails silently)?
  - Can an organizer promote another user to Admin by assigning them to a non-existent "admin" event?
- **Failure scenario:** Attacker registers as Organizer. Creates an event. Assigns their own user (who should be Attendee-only) as Staff. Now they can access staff-only check-in endpoints. OR: Assigns another user to an event but manipulates request to promote them to Admin role instead of Staff.
- **Evidence:** Phase 3 says "Organizer only" for staff assignment but does NOT specify role validation, user existence checks, or prevent privilege escalation through role assignment.
- **Suggested fix:**
  - Explicitly validate user exists and current role is NOT Admin before assigning as Staff
  - Enforce staff assignment does NOT change base user role (StaffAssignment is per-event, not global)
  - Log all staff assignments for audit
  - Prevent self-assignment to avoid bypass scenarios

---

## Finding 7: No Rate Limiting on Payment Webhook Simulation

- **Severity:** High
- **Location:** Phase 3 ("Backend API"), section "Orders API", subsection "Mock Payment"
- **Flaw:** Plan implements mock payment with `Task.Run(async () => { await Task.Delay(Random(3000, 5000)); ...})` to simulate delayed payment webhook. But there is NO rate limiting on order creation itself. An attacker can:
  - Create 10,000 orders in seconds
  - Each spawns a background Task (memory leak, thread pool exhaustion)
  - All tasks fire webhooks after 3-5s, causing DB write storm
  - System becomes unresponsive
- **Failure scenario:** Attacker writes a loop: create order for $0.01 (minimum price not specified), repeat 100,000 times. Server spawns 100k background tasks. After 5s, all attempt to update DB simultaneously. Database locks, legitimate payments fail, check-in becomes impossible.
- **Evidence:** Phase 3 specifies `Task.Run` with delay but no mention of rate limiting on order creation. "Risk Assessment" mentions "Mock payment delay — use `Task.Run` with delay, not blocking" but does NOT address DoS risk of unbounded Task creation.
- **Suggested fix:**
  - Add global rate limit: max 10 orders per user per minute
  - Add per-event rate limit: max 100 orders per minute
  - Use a proper job queue (Hangfire, MassTransit) instead of Task.Run for async payment processing
  - Validate minimum order value (no $0.01 orders)

---

## Finding 8: Check-In HMAC Validation Does Not Prevent Ticket ID Manipulation

- **Severity:** Medium
- **Location:** Phase 3 ("Backend API"), section "Check-In API"
- **Flaw:** Plan says HMAC validation ensures QR integrity, but QR data format is unspecified. If QR contains `ticketId|eventId|userId|signature`, attacker could:
  - Steal a valid QR code from one ticket
  - Modify `ticketId` in the payload (signature no longer valid)
  - BUT: if HMAC is computed over the entire string including IDs, modification breaks signature
  - HOWEVER: plan does NOT specify that the signature includes all IDs — if signature is only over a nonce, IDs are exploitable
- **Failure scenario:** QR data is `nonce=abc123|ticketId=123|signature=xyz`. Attacker extracts nonce + signature from one ticket, changes ticketId to 456. Signature is still valid because it was only computed over nonce. Attacker checks in with stolen signature + wrong ticket ID.
- **Evidence:** Phase 3 says "Validate QR Data → verify HMAC, extract ticketId" but does NOT specify WHAT is included in HMAC (payload format).
- **Suggested fix:**
  - Specify QR payload format: `HMAC(ticketId|eventId|userId|timestamp)` — all fields included in signature
  - Validate all extracted fields match DB record before check-in
  - Reject QR if any field extraction fails

---

## Summary Table

| Finding | Title | Severity | Impact |
|---------|-------|----------|--------|
| 1 | No CSRF Protection on Mutations | Critical | Order payment hijacking, ticket theft |
| 2 | Magic Link Token Enumeration & Brute Force | Critical | Account enumeration, unauthorized access |
| 3 | No Input Validation on Orders/Tickets | High | Quota overflow, integer overflow DoS, injection |
| 4 | Ticket Transfer Rate Limiting Missing | High | DoS via transfer spam, ticket state corruption |
| 5 | QR HMAC Key No Rotation/Versioning | High | Forged tickets, unrecoverable from key leak |
| 6 | Staff Assignment Privilege Escalation | High | Attendee → Staff → Admin bypass |
| 7 | No Rate Limiting on Order Creation | High | Background task DoS, DB write storm |
| 8 | Check-In HMAC Validation Incomplete | Medium | Ticket ID manipulation in QR payload |

---

## Recommended Prioritization for Implementation

**Phase 2 (Database & Identity) — CRITICAL BLOCKING ISSUES:**
- Add rate limiting on magic link requests (1 per email per 60s)
- Specify token entropy (32+ bytes random)
- Add enumeration protection (same response for registered/unregistered emails)

**Phase 3 (Backend API) — CRITICAL BLOCKING ISSUES:**
1. Add CSRF token validation on all mutations (X-CSRF-Token header + session token)
2. Add global + per-event rate limiting on order creation
3. Specify complete input validation rules for all DTOs
4. Implement QR HMAC key versioning + validation of all QR fields
5. Add rate limiting on ticket transfers
6. Add authorization check: prevent self-assignment as staff
7. Validate HMAC signature includes all QR fields (ticketId|eventId|userId|timestamp)

**Phase 4 (Frontend Auth & Layout) — MEDIUM ISSUES:**
- Implement CSRF token generation + header injection on all API mutations
- Ensure token forwarding to backend via X-CSRF-Token header

**Testing (Phase 9) — ADD SECURITY TESTS:**
- Test magic link enumeration protection
- Test order creation rate limiting
- Test CSRF token validation
- Test QR forgery attempt (modify payload, signature still valid = failure)
- Test staff self-assignment blocked

---

## Questions for Clarification

1. **CSRF Protection Strategy:** Will the implementation use explicit CSRF tokens or rely solely on SameSite=lax cookies? (Current plan is ambiguous.)
2. **Magic Link Token Format:** What is the minimum entropy for magic link tokens? Current plan says "generate token" without specifying size/randomness.
3. **Rate Limiting Framework:** Will rate limiting use middleware (e.g., AspNetCoreRateLimit), library (e.g., Polly), or custom Redis-based solution?
4. **QR Payload Format:** Exact format of QR data — is it `ticketId|eventId|userId|timestamp|HMAC(all)` or something different?
5. **Input Validation Framework:** Will use FluentValidation, DataAnnotations, or custom validators? Specification needs detail.
6. **Job Queue for Async Payments:** Is background Task.Run acceptable for MVP, or should Hangfire/MassTransit be used for reliability?

---

**Report Status:** Complete — 8 findings, 3 Critical, 4 High, 1 Medium.
Recommend addressing Critical + High issues before Phase 2 implementation begins.
