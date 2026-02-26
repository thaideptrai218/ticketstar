# Red Team Scope Review — TicketStar MVP

## Executive Summary

This plan is **over-engineered for an MVP**. Critical scope creep across phases 3–8 violates YAGNI principles. Estimated effort inflates from 80h to 120h+ with unnecessary complexity. Five major findings below.

---

## Finding 1: Multi-Role Authorization Explosion (YAGNI)

- **Severity:** Critical
- **Location:** Phase 2 (10h), Phase 3 (16h), Phase 4 (8h), Phase 7-8 (12h collectively)
- **Flaw:** Plan defines 4 roles (Admin, Organizer, Staff, Attendee) with 100+ authorization rules scattered across 14 controllers/pages, but MVP needs only **2 roles: Organizer + Attendee**.
- **Failure scenario:**
  - Phase 2 seeding 4 roles, Phase 3 builds StaffController + AdminController endpoints, Phase 7 builds organizer/staff/admin sidebar navigation.
  - Phase 8 builds entire Staff check-in portal + Admin user management.
  - Developer must test 4x role permutations across 40+ endpoints (staff event scoping, admin user lock/unlock, etc.).
  - 16h for check-in in Phase 3 balloons to 22h total (Phase 3 CheckInService + CheckInController + Phase 8 scanner + permissions testing).
  - **Reality:** Staff = temporary event workers. Admin = future ops role. Both deletable from MVP without breaking core product loop (create event → buy tickets → check in).
- **Evidence:**
  - Phase 2: "4 roles: Admin, Organizer, Staff, Attendee"
  - Phase 3: separate StaffController + AdminController with full permission checks
  - Phase 8: "6h" for Staff + Admin, but requires useQRScanner hook, camera permissions, event selection page, admin dashboard + users table
- **Suggested fix:**
  - **MVP:** Organizer (create events, view orders) + Attendee (buy tickets) only.
  - **Post-MVP:** Add Staff role via separate planning cycle.
  - **Removes:** StaffAssignment entity, staff authorization logic from all 40+ endpoints, entire AdminController, Phase 8 staff check-in portal (move to Phase 2 of next iteration).
  - **Impact:** Phase 2 shrinks to 7h, Phase 3 shrinks to 12h, Phase 4/7 shrink 3-4h each, Phase 8 vanishes. **Total delta: -18h**.

---

## Finding 2: Premature QR + Check-In Complexity

- **Severity:** High
- **Location:** Phase 3, section "8. QR Code Service" (16h effort includes QR + check-in) + Phase 8 "QR Scanner Hook"
- **Flaw:** Plan builds HMAC-signed QRs + check-in anti-duplicate detection as MVP core, but attendee primary journey is "buy → view ticket PDF". Check-in is organizer concern (event day operations), not attendee retention driver.
- **Failure scenario:**
  - Phase 3 requires QrCodeService (HMAC generation, QRCoder PNG encoding), CheckInService (QR validation, duplicate detection), Redis lock for ticket quota, CheckInController (scan endpoint).
  - Phase 6 requires TicketQrDisplay component (SVG render from qrData).
  - Phase 8 requires useQRScanner hook (camera + @zxing/browser), manual code entry fallback, camera permission handling.
  - Phase 9 adds CheckInTests (5 integration test cases).
  - **Complexity:** HMAC validation, QR payload encoding/decoding, camera API, browser compatibility (Safari specifically called out).
  - **Bottleneck:** Phase 8 (staff check-in) blocked until backend fully working. If testing finds race condition in check-in or camera issues, blocks Phase 9.
  - **MVP reality:** Organizers care about ticket sales + revenue. Attendees care about "I have a ticket". Check-in scanning can be manual admin duty or cut entirely in MVP.
- **Evidence:**
  - Phase 3: "QR: HMAC-signed payload, base64 PNG in API response" — 3 new services, Redis config, 3 message types for email stubs
  - Phase 8: "Camera API browser support: @zxing/browser handles most modern browsers; test Safari specifically"
  - Phase 9: CheckInTests (5 cases, separate from other test groups)
- **Suggested fix:**
  - **MVP:** Remove check-in entirely. Phase 6 "My Tickets" shows ticket ID only (no QR). Organizer downloads attendee list from API as CSV or JSON (new endpoint, 2h max).
  - **Post-MVP:** Implement QR + scanner in Phase 2 of next iteration after validating product-market fit.
  - **Removes:** QrCodeService, CheckInService, CheckInController, useQRScanner hook, Phase 8 scanner UI, 5 CheckInTests.
  - **Impact:** Phase 3 shrinks 4h (no QR/check-in endpoints), Phase 6 shrinks 2h (no QRDisplay, no transfer), Phase 8 vanishes, Phase 9 shrinks 2h. **Total delta: -10h**. Huge complexity reduction.

---

## Finding 3: RabbitMQ + MassTransit Over-Engineering for Email Stubs

- **Severity:** High
- **Location:** Phase 1 (docker-compose), Phase 2 (email endpoints), Phase 3, sections "13. RabbitMQ Email Stubs" + "Messaging" architecture
- **Flaw:** Plan requires RabbitMQ + MassTransit for MVP with "console stub" consumers. This is backwards: add async task queue only when async is needed. Email stubs don't need queuing.
- **Failure scenario:**
  - Phase 1: Docker Compose brings up RabbitMQ service (adds dev complexity, container startup time).
  - Phase 2: MagicLinkService publishes events, no actual email sent (console log only).
  - Phase 3: Creates 3 message types (OrderConfirmationEmail, MagicLinkEmail, TicketTransferEmail) with consumers that log to console.
  - Phase 3 backend integration: register MassTransit in Program.cs, configure RabbitMQ connection.
  - **Impact:** Dev must debug RabbitMQ connectivity issues, message routing, consumer setup — all for stubs. Real email service (SendGrid, Mailgun) can be plugged in later via a simple SMTP sender or API client.
  - **Testing:** Phase 9 requires understanding MassTransit consumer testing patterns, adds cognitive load.
  - **Truth:** MVP doesn't need email. Phase 2 Magic Link can store token, next phase adds actual email. Order confirmation can email on Phase 2 of next iteration.
- **Evidence:**
  - Phase 1: "rabbitmq: image rabbitmq:3-management, ports 5672, 15672"
  - Phase 2, Step 7: "publish email event via MassTransit"
  - Phase 3, section "13. RabbitMQ Email Stubs": "Consumers that log to console (stub)"
- **Suggested fix:**
  - **MVP:** Remove RabbitMQ entirely. Replace event publishing with direct console.log("Would send email: {type}").
  - **Impact:** Phase 1 docker-compose shrinks to MySQL + Redis only (faster startup, simpler troubleshooting). Phase 2 auth drops MassTransit publish calls. Phase 3 drops Message classes + Consumers. Phase 9 skips MassTransit testing.
  - **Removes:** MassTransit NuGet, RabbitMQ container, 3 message types, 3 consumers, 20+ lines of Program.cs DI.
  - **Total delta: -3h** (Phase 1: -1h, Phase 2: -0.5h, Phase 3: -1.5h).

---

## Finding 4: Dashboard Metrics & Payout Views Over-Scope for Organizer MVP

- **Severity:** Medium
- **Location:** Phase 7, sections "1. Dashboard" + "7. Payout" (10h total)
- **Flaw:** Phase 7 includes organizer dashboard (stats cards: total events, orders, revenue), event management, ticket types, **AND** check-in stats, **AND** staff management, **AND** payout summary + detail. This is 5 separate concerns. MVP organizer needs: create event + view it on marketplace. Payout view is nice-to-have; stats are vanity metrics.
- **Failure scenario:**
  - Phase 7 implements Dashboard page (fetch stats from 4+ endpoints: events count, orders count, revenue calculation, upcoming events).
  - Implements Event Management (list, create, edit, publish/unpublish).
  - Implements Ticket Type Management (add, edit, delete with quota checks).
  - Implements Check-in Stats (real-time polling with refetchInterval: 10s).
  - Implements Staff Management (assign/remove staff).
  - Implements Payout (summary view, detail view, breakdown by ticket type, order list).
  - **Developer burden:** 10h requires building 6+ interconnected pages, handling loading states, error boundaries, real-time updates. Form complexity high (event form, ticket type form, date pickers, validation).
  - **Validation risk:** unclear which payout view is used (summary vs detail?), order list in payout detail unclear how filtered.
- **Evidence:**
  - Phase 7 overview: "Organizer dashboard, event CRUD, ticket type management, check-in view, payout"
  - Todo list: 10 tasks spanning 6 different concerns
  - Success criteria: "Create event → add ticket types → publish → visible on marketplace" (core), **plus** "Check-in stats update in real-time", "Staff management works", "Payout shows correct revenue" (all secondary)
- **Suggested fix:**
  - **MVP:** Organizer pages: Events (list, create, edit, publish only). No dashboard, no check-in stats, no staff page, no payout detail.
  - **Rationale:** Event creation validates product. Payout can be CSV export post-Phase 1. Check-in stats require staff role (Finding 1: cut staff). Dashboard vanity metrics add no value before Phase 2.
  - **Removes:** Dashboard page, check-in stats page, staff management page, payout summary + detail, event-stats-card, staff-management, payout-summary-card components.
  - **Impact:** Phase 7 shrinks to 3h (event CRUD only: list, create form, edit form, publish toggle). Payout moved to Phase 1 of next iteration.
  - **Total delta: -7h**.

---

## Finding 5: Fragmented Frontend Testing Strategy (Wrong Tool Choice)

- **Severity:** Medium
- **Location:** Phase 9, sections "Frontend E2E Setup" + "4. Frontend E2E Tests", effort 8h split 50/50 backend vs frontend
- **Flaw:** Plan uses Playwright for E2E but only tests 3 journeys (purchase, organizer event creation, check-in) with heavy reliance on "seed data via API". This is slow feedback loop. For MVP, focus on backend integration tests. Playwright adds CI overhead (browser install, headless setup) without proportional gain.
- **Failure scenario:**
  - Phase 9 requires: `npx playwright install` (browser download, ~500MB), playwright.config.ts setup, test helpers for login/seed.
  - 3 E2E test files (purchase-flow, organizer-event-creation, checkin-flow).
  - Playwright overhead: 2-3x slower than server-side tests, flaky camera testing (Safari noted in Phase 8), manual code entry in check-in tests.
  - **CI impact:** E2E runs take 2-3min per test suite in CI. For MVP, backend integration tests (15+ cases) give faster feedback on critical flows.
  - **Truth:** Frontend is React/Next.js — mostly form logic and API calls. Backend is where business logic lives (quota locks, token rotation, payment). Unit + integration tests on backend > E2E on frontend for MVP.
- **Evidence:**
  - Phase 9: "Playwright for key user journeys (saves time vs component tests)" — contradicted by "Camera testing skipped — manual entry covers the logic" (shows Playwright can't fully test camera).
  - Phase 9 setup: requires test helpers, API seeding, base URL config, webServer config.
  - Success criteria: "npx playwright test — all 3+ E2E tests pass" — only 3 tests for full app coverage is weak.
- **Suggested fix:**
  - **MVP Phase 9:** Focus on backend integration tests (20+ cases) only. Skip Playwright entirely.
  - **Rationale:** Backend tests cheaper to maintain, faster to run, more reliable (no browser state issues). Frontend is CRUD views over APIs — if backend works, frontend works (React/Next.js are stable).
  - **Post-MVP:** Add Playwright for critical journeys after MVP launch if monitoring shows frontend issues.
  - **Removes:** Playwright config, test helpers, 3 E2E test files, browser installation overhead.
  - **Impact:** Phase 9 stays 8h (backend tests) but removes 2-3h of E2E setup + maintenance overhead.
  - **Total delta: -2h (setup) + faster iteration**.

---

## Finding 6: Unused Infrastructure & Features (YAGNI)

- **Severity:** Medium
- **Location:** Multiple phases
- **Flaw:** Plan includes features/infrastructure not tied to MVP success:
  1. **Google OAuth** (Phase 2): Added to auth, but Magic Link alone validates. OAuth adds Google Cloud project setup, credential management, dependency on external service. Magic Link simpler MVP path.
  2. **OAuth redirect complexity** (Phase 4): "Next.js route handlers proxy auth to .NET backend" — unnecessary indirection if backend handles OAuth directly.
  3. **Refresh token rotation** (Phase 2): "If reuse of revoked token detected → revoke all user tokens" — complex state machine for MVP. Simpler: refresh tokens don't rotate, just expire.
  4. **Event slug generation** (Phase 3): "generate slug from title" — added complexity for SEO that MVP doesn't need yet.
- **Evidence:**
  - Phase 2: "OAuth via Google external login" listed as requirement
  - Phase 4: "useAuth hook: calls /api/auth/me endpoint that reads httpOnly cookie" — workaround for httpOnly limitation
  - Phase 2: "If reuse of revoked token detected → revoke all user tokens"
  - Phase 3: EventService "generate slug from title"
- **Suggested fix:**
  - Remove Google OAuth, keep Magic Link only.
  - Simplify refresh token: no rotation, no reuse detection. Use expiry only.
  - Remove slug generation, use event ID only.
  - Impact: Phase 2 shrinks 2h, Phase 3 shrinks 1h, Phase 4 shrinks 1h. **Total delta: -4h**.

---

## Summary Table

| Finding | MVP Impact | Effort Savings | Severity |
|---------|-----------|-----------------|----------|
| 1. Multi-role authorization | Cut 4-role system → Organizer + Attendee | -18h | Critical |
| 2. QR + Check-in | Cut scanner portal, keep ticket ID only | -10h | High |
| 3. RabbitMQ + MassTransit | Replace stubs with console.log | -3h | High |
| 4. Dashboard + Payout overhead | Cut to event CRUD only | -7h | Medium |
| 5. Playwright E2E | Focus backend integration tests | -2h | Medium |
| 6. Google OAuth + extras | Keep Magic Link, simplify token handling | -4h | Medium |
| **TOTAL** | **Reduce from 80h to ~36h, improve MVP focus** | **-44h** | — |

---

## Post-MVP Roadmap (Out of Scope)

These features belong in Phase 2 of the next iteration:

1. **Staff role + check-in portal** (16h)
2. **Admin role + user management** (8h)
3. **QR codes + scanner** (12h)
4. **RabbitMQ + real email service** (8h)
5. **Dashboard metrics + payout detail** (8h)
6. **Google OAuth** (4h)
7. **Organizer analytics** (12h)

---

## Unresolved Questions

1. **MVP success metric:** What validates product-market fit? Event creation + purchase flow? Or do organizers need check-in working day 1?
2. **Email requirement:** Can Magic Link token be verified manually (copy-paste) in MVP, removing email entirely?
3. **Payment:** Phase 3 mocks payment with 3-5s delay. Should MVP connect to real Stripe/SePay, or is mock sufficient for testing?
4. **Database choice:** Why MySQL + Pomelo specifically? Is this a hard constraint, or could SQLite simplify Phase 1 MVP?

