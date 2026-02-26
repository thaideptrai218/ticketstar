# Phase 9 — Testing

## Context Links
- [Plan Overview](plan.md) | All previous phases

## Overview
- **Priority:** P2 | **Status:** pending | **Effort:** 8h
- **Depends on:** Phases 5, 6, 7, 8
- Backend integration tests (xUnit), Frontend E2E tests (Playwright)

## Key Insights
- Focus on critical flows, not 100% coverage
- Integration tests > unit tests for MVP (test real DB/Redis interactions)
- Playwright for key user journeys (saves time vs component tests)

## Requirements
- Backend: test checkout flow, check-in anti-duplicate, order expiry, auth
- Frontend: test attendee purchase flow, organizer event creation, check-in flow

## Related Code Files
**Create:**
- `backend/tests/TicketStar.Tests/IntegrationTests/OrderFlowTests.cs`
- `backend/tests/TicketStar.Tests/IntegrationTests/CheckInTests.cs`
- `backend/tests/TicketStar.Tests/IntegrationTests/AuthTests.cs`
- `backend/tests/TicketStar.Tests/IntegrationTests/OrderExpiryTests.cs`
- `backend/tests/TicketStar.Tests/Fixtures/TestWebApplicationFactory.cs`
- `backend/tests/TicketStar.Tests/Fixtures/DatabaseFixture.cs`
- `frontend/e2e/purchase-flow.spec.ts`
- `frontend/e2e/organizer-event-creation.spec.ts`
- `frontend/e2e/checkin-flow.spec.ts`
- `frontend/playwright.config.ts`

## Implementation Steps

### 1. Backend Test Infrastructure
1. Create `TestWebApplicationFactory` using `WebApplicationFactory<Program>`
2. Replace MySQL with in-memory or test MySQL container (Testcontainers.MySQL NuGet)
3. Replace Redis with test instance
4. Seed test data: users (one per role), events, ticket types
5. Helper: `AuthenticatedClient(role)` — creates HttpClient with valid JWT

### 2. Backend Integration Tests

**OrderFlowTests:**
- Create order → verify Pending status, ExpiresAt set
- Pay order → verify Paid, tickets generated with QR
- Cancel pending order → verify Cancelled, reservations released
- Create order exceeding quota → verify 409 Conflict
- Concurrent orders for last ticket → only one succeeds (Redis lock test)

**CheckInTests:**
- Scan valid QR → verify success, IsCheckedIn = true
- Scan same QR again → verify 409 "Already checked in"
- Scan invalid HMAC → verify 400
- Scan wrong event → verify 400
- Non-staff user → verify 403

**AuthTests:**
- Magic link request → verify token created
- Magic link verify → verify JWT returned
- Refresh token → verify new tokens, old revoked
- Reuse revoked refresh token → verify all tokens revoked

**OrderExpiryTests:**
- Create order, manually set ExpiresAt to past
- Trigger expiry service
- Verify order Expired, Redis counters decremented

### 3. Frontend E2E Setup
1. Install Playwright: `npx playwright install`
2. Configure `playwright.config.ts`: base URL, test dir, webServer config
3. Create test helpers: login, seed data via API

### 4. Frontend E2E Tests

**purchase-flow.spec.ts:**
- Visit homepage → click event → select tickets → checkout → pay → my tickets shows QR
- Attempt purchase when sold out → see error message

**organizer-event-creation.spec.ts:**
- Login as organizer → create event → add ticket types → publish → verify on marketplace

**checkin-flow.spec.ts:**
- Login as staff → select event → manual code entry → verify success/duplicate states
- (Camera testing skipped — manual entry covers the logic)

## Todo List
- [ ] Create TestWebApplicationFactory with test DB
- [ ] Create test data seeder
- [ ] Write OrderFlowTests (5 test cases)
- [ ] Write CheckInTests (5 test cases)
- [ ] Write AuthTests (4 test cases)
- [ ] Write OrderExpiryTests (1 test case)
- [ ] Setup Playwright config
- [ ] Write purchase flow E2E test
- [ ] Write organizer event creation E2E test
- [ ] Write check-in flow E2E test
- [ ] All tests pass in CI

## Success Criteria
- `dotnet test` — all 15+ backend tests pass
- `npx playwright test` — all 3+ E2E tests pass
- Critical path covered: order creation → payment → ticket → check-in
- Anti-duplicate check-in verified
- Concurrent quota enforcement verified

## Risk Assessment
- **Test DB setup time:** Testcontainers adds startup overhead; acceptable for CI
- **Playwright flakiness:** use explicit waits, not timeouts
- **Mock payment timing in tests:** override delay to 0 for faster tests

## Security Considerations
- Test secrets separate from production
- No real payment data in tests
- Test users isolated from production

## Next Steps
- Deploy MVP (future phase, out of current scope)
