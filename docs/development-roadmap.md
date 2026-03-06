# TicketStar - Development Roadmap

## Project Phases Overview

| Phase | Name | Effort | Status | Progress |
|-------|------|--------|--------|----------|
| 1 | Project Scaffolding | 6h | ✅ Complete | 100% |
| 2 | Database & Identity | 10h | ✅ Complete | 100% |
| 2b | Auth Hardening (Security) | 22h | ✅ Complete | 100% |
| 3 | Backend API | 16h | ✅ Complete | 100% |
| 4 | Frontend Auth & Layout | 8h | ✅ Complete | 100% |
| 5 | Frontend Marketplace | 10h | ✅ Complete | 100% |
| 6 | Frontend Attendee | 6h | 🔄 Pending | 0% |
| 7 | Frontend Organizer | 10h | 🔄 Pending | 0% |
| 8 | Frontend Staff & Admin | 6h | 🔄 Pending | 0% |
| 9 | Testing | 8h | 🔄 Pending | 0% |

**Total Effort:** 80 hours

---

## Phase 1: Project Scaffolding ✅ Complete

**Status:** Complete
**Completed:** 2026-02-26
**Effort:** 6 hours

### Deliverables

#### Backend (.NET 8)
- [x] Solution file: `TicketStar.sln`
- [x] Four-layer project structure:
  - [x] `TicketStar.API` - Web API layer
  - [x] `TicketStar.Application` - Business logic layer
  - [x] `TicketStar.Domain` - Core entities & interfaces
  - [x] `TicketStar.Infrastructure` - Data & external services
- [x] Test project: `TicketStar.Tests`
- [x] NuGet packages configured

#### Frontend (Next.js 15)
- [x] Next.js 15.16 with App Router
- [x] TypeScript 5 configuration
- [x] Tailwind CSS 4 setup
- [x] shadcn/ui components configured
- [x] React 19.2.3
- [x] TanStack React Query for data fetching
- [x] Project structure:
  - [x] `app/` - App Router pages
  - [x] `components/` - React components
  - [x] `hooks/` - Custom hooks
  - [x] `lib/` - Utilities
  - [x] `types/` - TypeScript types

#### Infrastructure (Docker)
- [x] MySQL 8.0 (Port 3307)
- [x] Redis 7-Alpine (Port 6380)
- [x] RabbitMQ 3 Management (Ports 5672, 15672)
- [x] Health checks configured
- [x] Volume persistence for MySQL

#### Configuration
- [x] `.env.example` template created
- [x] `.gitignore` configured
- [x] Git repository initialized
- [x] Port mappings:
  - Frontend: 3001
  - Backend: 5010
  - MySQL: 3307
  - Redis: 6380
  - RabbitMQ: 5672, 15672

#### Validation
- [x] `dotnet build` passing
- [x] `pnpm build` passing
- [x] Docker services start successfully

---

## Phase 2: Database & Identity ✅ Complete

**Status:** Complete
**Completed:** 2026-02-27
**Effort:** 10 hours
**Dependencies:** Phase 1

### Completed Deliverables

#### Database Schema
- [x] EF Core DbContext (plain, no ASP.NET Identity)
- [x] Entity models:
  - [x] User (core identity)
  - [x] UserProfile (extended attributes)
  - [x] AuthIdentity (OAuth provider accounts)
  - [x] AuthSession (session tracking)
  - [x] SecurityEvent (audit trail)
  - [x] WebAuthnCredential (MFA support)
  - [x] MagicLink (passwordless tokens)
  - [x] RefreshToken (rotation tracking)
  - [x] EmailChangeRequest (pending changes)
- [x] Relationships & navigation properties configured
- [x] Database migrations (InitialAuth)

#### Identity System
- [x] Custom authentication services (no Identity framework)
- [x] JWT token generation & validation (15 min expiry)
- [x] Refresh token storage with rotation (7 day expiry)
- [x] Role-based authorization (Admin, Organizer, Staff, Attendee)
- [x] Seeding: 4 roles, admin user

#### Authentication Endpoints (8 total)
- [x] POST /auth/register - User registration
- [x] POST /auth/login-email - Email/password login
- [x] POST /auth/google - Google OAuth integration
- [x] POST /auth/apple - Apple OAuth integration
- [x] POST /auth/magic-link/request - Magic link request
- [x] POST /auth/magic-link/verify - Magic link verification
- [x] POST /auth/refresh - Token refresh with rotation
- [x] POST /auth/logout - Logout with revocation

#### Security
- [x] Argon2id password hashing (OWASP 2025 params)
- [x] SHA-256 token hashing with constant-time comparison
- [x] CSPRNG random token generation
- [x] JWT secret configuration
- [x] Rate limiting on magic link endpoint
- [x] Refresh token rotation with reuse detection
- [x] Account lockout (5 failed attempts)
- [x] Security event audit logging

### Success Criteria
- [x] All migrations apply cleanly to MySQL
- [x] Google OAuth flow works end-to-end
- [x] Magic link tokens generated & verified
- [x] Refresh token rotation functional with reuse detection
- [x] 4 roles seeded in database
- [x] 35 unit tests passing (100%)
- [x] Build: 0 errors, 0 critical warnings

---

## Phase 2b: Auth Hardening (Security) ✅ Complete

**Status:** Complete
**Completed:** 2026-03-01
**Effort:** 22 hours
**Dependencies:** Phase 2

### OWASP Security Fixes (3 CRITICAL + 8 HIGH findings)

**Phase 0: Critical Quick Fixes** ✅
- Removed plaintext magic link token from logs (C1)
- Added password MaxLength validation 128 chars (C3)
- Made CORS origins configurable via config (H7)
- Added MaxLength to token DTOs (H8)

**Phase 1: Redis Infrastructure & Rate Limiting** ✅
- Integrated Redis (StackExchange.Redis)
- Implemented distributed rate limiting (login 10/5min, register 5/15min, refresh 30/5min, magic-link 5/15min)
- Added Redis health checks
- Graceful degradation when Redis unavailable

**Phase 2: HttpOnly Cookie + Security Headers** ✅
- Refresh tokens moved to HttpOnly secure cookies (SameSite=Strict)
- Added HTTPS enforcement + HSTS (365 days)
- Implemented security response headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Added logout token ownership validation (H4)
- Created AccessTokenResponse DTO

**Phase 3: Multi-Tab Reuse Grace Period** ✅
- 10-second grace period for simultaneous refresh token reuse
- Added RowVersion concurrency token to RefreshToken entity
- Implemented DbUpdateConcurrencyException handling
- Redis-backed grace period cache

**Phase 4: Access Token Shortening & Token Blacklist** ✅
- Reduced access token lifetime 15min → 5min
- Implemented Redis-based JTI blacklist for instant revocation
- Added TokenBlacklistMiddleware for protected endpoints
- Wrapped RevokeAllSessions in transaction (H5)

**Phase 5: TOTP MFA Implementation** ✅
- Implemented RFC 6238 TOTP (Google Authenticator compatible)
- Added MFA setup/verify flow with QR code generation
- Recovery codes (8 codes, SHA-256 hashed, one-time use)
- MFA challenge endpoint with 5-min JWT mfaToken
- AuthResponse discriminated union for MFA-aware login flow
- AES-256 encrypted TOTP secret storage

### Completed Deliverables

- 6 phases completed across 260228-1026-auth-hardening plan
- 27 AuthServiceTests all passing
- Zero breaking changes to existing API contracts
- Full backward compatibility maintained

### Security Metrics
- **OWASP Score Improvement:** 4/10 → 8/10 (estimated)
- **Rate Limiting:** 4 endpoints protected (distributed)
- **Token Security:** Shortened lifetime + blacklist + grace period
- **Multi-Factor:** TOTP MFA with recovery codes
- **Data Protection:** Encrypted at-rest secrets + secure cookies

### Exceptions (Deferred)
- **H6 SecurityStamp validation on refresh:** Requires AuthSession schema modification
- **EF migration for Phase 5 MFA:** User performed Phase 3 migration manually
- **Frontend migration:** Requires credentials: 'include' + MFA UI implementation

### Success Criteria
- [x] All OWASP critical findings addressed
- [x] 6/6 phases implemented
- [x] Tests passing (27 AuthService tests)
- [x] Code compiles without errors
- [x] Rate limiting functional
- [x] MFA system operational

---

## Phase 3: Backend API ✅ Complete

**Status:** Complete
**Completed:** 2026-03-04
**Effort:** 16 hours
**Dependencies:** Phase 2

### Completed Deliverables

#### Core Services ✅
- [x] EventService (CRUD + quota logic)
- [x] TicketService (purchase + QR generation)
- [x] OrderService (SePay integration)
- [x] CheckInService (QR validation)
- [x] TicketTypeService (tier management)
- [x] PayoutService (organizer earnings)
- [x] QrCodeService (HMAC-signed QR generation)

#### Controllers ✅
- [x] EventsController (list, detail, search)
- [x] TicketsController (purchase, list)
- [x] OrdersController (status polling)
- [x] CheckInController (QR scan validation)
- [x] TicketTypesController (create, update, delete)
- [x] PayoutController (withdrawal)
- [x] WebhooksController (SePay payments)
- [x] AdminController (user/event management)
- [x] StaffController (event check-ins)

#### Caching ✅
- [x] Redis cache service
- [x] Distributed lock for ticket quota
- [x] Cache invalidation strategy
- [x] Event detail caching (1h TTL)

#### Messaging ✅
- [x] MassTransit + RabbitMQ setup
- [x] Email stub consumers (console log)
- [x] Order confirmation message (OrderCreated event)
- [x] Email notification messages

#### External Services ✅
- [x] SePay webhook handler (payment confirmation)
- [x] QR code signature validation
- [x] Ticket quota enforcement with Redis lock

### Success Criteria
- [x] All CRUD operations functional
- [x] Ticket quota enforcement (Redis lock)
- [x] QR code generation with HMAC signature
- [x] SePay webhook processing
- [x] RabbitMQ messages published
- [x] Search/filter endpoints
- [x] Pagination support

---

## Phase 4: Frontend Auth & Layout ✅ Complete

**Status:** Complete
**Completed:** 2026-03-06
**Effort:** 8 hours
**Dependencies:** Phase 1

### Completed Deliverables

#### Landing Page ✅
- [x] Hero section with flip cards
- [x] Features section
- [x] How it works section (step illustrations)
- [x] Featured events section
- [x] Footer section
- [x] Navigation bar
- [x] Scroll reveal animations

#### Authentication Pages ✅
- [x] Login page (email/password + Google OAuth)
- [x] Register page
- [x] Magic link verify page
- [x] Settings/security page (MFA)
- [x] Unauthorized error page

#### Auth Components ✅
- [x] MFA challenge form
- [x] MFA setup wizard
- [x] Recovery codes display
- [x] Magic link request form
- [x] Google login button
- [x] Password input
- [x] User menu
- [x] Login/register forms

#### API Integration ✅
- [x] Browser API client with auto-refresh on 401 (concurrent-safe queue)
- [x] Server-side API client with cookie forwarding
- [x] Auth API client with typed endpoints
- [x] Error handling with field-level validation
- [x] Type definitions (ApiResponse<T>, PagedResult<T>, auth DTOs)
- [x] Auth context/provider with user hydration from /api/auth/me
- [x] Token manager for lifecycle management

#### Auth Proxy Layer ✅
- [x] Next.js proxy routes at /api/auth/* (register, login, refresh, logout, MFA endpoints)
- [x] Cookie management: ts_at (access, httpOnly, 5min) and refresh_token (httpOnly, SameSite=Strict)
- [x] Browser never directly calls backend for auth
- [x] Proxy transparently handles Set-Cookie headers

#### Middleware & Routing ✅
- [x] `middleware.ts` — JWT decode + role-based redirect
- [x] Role-based route groups: (organizer), (admin), (attendee), (staff)
- [x] Protected route protection with login redirect + returnUrl
- [x] Unauthorized error page for insufficient permissions

#### Layout & Components ✅
- [x] shadcn/ui integration (15+ components)
- [x] App sidebar component for dashboard
- [x] Page transitions
- [x] Loading states (skeleton)
- [x] UI Components (buttons, forms, dialogs, toasts, etc.)

### Success Criteria
- [x] Landing page renders
- [x] Auth forms functional
- [x] Google OAuth flow works end-to-end
- [x] Magic link form submits via proxy
- [x] Protected routes redirect to /login
- [x] MFA setup/challenge flows functional
- [x] API client handles 401 refresh transparently
- [x] AuthContext provides user state
- [x] All middleware role checks enforce permissions
- [x] httpOnly cookies secure against XSS

---

## Phase 5: Frontend Marketplace ✅ Complete

**Status:** Complete
**Completed:** 2026-03-06
**Effort:** 10 hours
**Dependencies:** Phase 3, Phase 4

### Completed Deliverables

#### Public Pages ✅
- [x] Event listing page (`/events`) with search & filters
- [x] Event detail page (`/events/[slug]`) with SSR + metadata
- [x] Checkout page (`/app/checkout`) with ProtectedRoute
- [x] Landing page integrated with marketplace

#### Components ✅
- [x] EventCard component (image, title, date, price, availability)
- [x] EventGrid component (responsive layout)
- [x] EventFilters component (category, date range, price)
- [x] TicketTypeSelector component (tier selection + quantity)
- [x] CheckoutForm component (form state + validation)
- [x] PaymentStatus component (order polling + result display)

#### Hooks ✅
- [x] useEventSearch (debounced, URL-synced search + filters)
- [x] useCheckout (state machine, order polling with recursive setTimeout)

#### Features ✅
- [x] Event search/filter (debounced, updates URL)
- [x] SSR event detail with generateMetadata (SEO + OpenGraph)
- [x] QR code display after purchase (PaymentStatus component)
- [x] Order status polling (2s interval, 2min max, handles 409 conflict)
- [x] Responsive design (mobile-first)
- [x] Format utilities (formatPrice, formatDate, formatTime)

#### Architecture Decisions ✅
- [x] Event detail: SSR (SEO) + generateMetadata for social cards
- [x] Event listing: CSR (interactive filters)
- [x] Checkout: Protected route under (app) layout with ProtectedRoute wrapper
- [x] Order polling: Recursive setTimeout (no overlapping), 2s interval, 2min max
- [x] 409 conflict handling: Graceful sold-out ticket feedback

### Success Criteria
- [x] Browse all events with search/filter
- [x] View event details with rich metadata
- [x] Select ticket tiers and quantities
- [x] Complete checkout flow
- [x] View QR code after successful purchase
- [x] Order status polls correctly
- [x] Responsive across mobile/tablet/desktop
- [x] SEO metadata renders for social sharing

---

## Phase 6: Frontend Attendee 🔄 Pending

**Status:** Pending
**Estimated Start:** 2026-03-05
**Effort:** 6 hours
**Dependencies:** Phase 3, Phase 4

### Planned Deliverables

#### Pages
- [ ] My Tickets page
- [ ] Ticket detail page
- [ ] QR code display

#### Features
- [ ] List purchased tickets
- [ ] Filter by event/date
- [ ] Display QR for check-in
- [ ] Ticket status (active/used)

### Success Criteria
- [ ] View all owned tickets
- [ ] QR code renders correctly
- [ ] Ticket status updates

---

## Phase 7: Frontend Organizer 🔄 Pending

**Status:** Pending
**Estimated Start:** 2026-03-06
**Effort:** 10 hours
**Dependencies:** Phase 3, Phase 4

### Planned Deliverables

#### Pages
- [ ] Organizer dashboard
- [ ] Create event page
- [ ] Edit event page
- [ ] Event statistics page
- [ ] Check-in report page

#### Components
- [ ] EventForm component
- [ ] TicketTierEditor component
- [ ] StatsCard component
- [ ] CheckInList component

#### Features
- [ ] Create/edit events
- [ ] Manage ticket tiers
- [ ] View sales statistics
- [ ] View check-in counts
- [ ] Payout summary

### Success Criteria
- [ ] Create event with tiers
- [ ] Edit existing events
- [ ] View real-time stats
- [ ] Check-in report accurate

---

## Phase 8: Frontend Staff & Admin 🔄 Pending

**Status:** Pending
**Estimated Start:** 2026-03-08
**Effort:** 6 hours
**Dependencies:** Phase 3, Phase 4

### Staff Deliverables
- [ ] Staff dashboard (assigned events)
- [ ] Check-in scanner page
- [ ] Attendee search
- [ ] Manual check-in override

### Admin Deliverables
- [ ] Admin dashboard
- [ ] User management
- [ ] Platform statistics
- [ ] System configuration

### Success Criteria
- [ ] Staff scans QR codes
- [ ] Check-in updates in real-time
- [ ] Admin manages users
- [ ] Admin views platform stats

---

## Phase 9: Testing 🔄 Pending

**Status:** Pending
**Estimated Start:** 2026-03-10
**Effort:** 8 hours
**Dependencies:** Phase 5, Phase 6, Phase 7, Phase 8

### Planned Deliverables

#### Backend Tests
- [ ] Unit tests (Services)
- [ ] Integration tests (API)
- [ ] Repository tests
- [ ] >80% code coverage

#### Frontend Tests
- [ ] Component tests (React Testing Library)
- [ ] Hook tests
- [ ] E2E tests (Playwright)

#### End-to-End Scenarios
- [ ] User registration & login
- [ ] Event creation
- [ ] Ticket purchase
- [ ] QR check-in
- [ ] Payment webhook processing

### Success Criteria
- [ ] All unit tests passing
- [ ] >80% backend coverage
- [ ] >70% frontend coverage
- [ ] All E2E scenarios passing

---

## Critical Path

```
Phase 1 (Scaffolding)
         ↓
    ┌────┴────┐
    ↓         ↓
Phase 2   Phase 4
(Database) (Auth UI)
    ↓         ↓
    └───Phase 3───┘
      (Backend API)
         ↓
    Phase 5 (Marketplace) ←── Core User Journey
         ↓
    Phase 6 (Attendee)
    Phase 7 (Organizer)
    Phase 8 (Staff/Admin)
         ↓
    Phase 9 (Testing)
```

---

## Milestones

| Milestone | Target Phase | Status |
|-----------|--------------|--------|
| Infrastructure Ready | Phase 1 | ✅ Complete |
| Data Layer Complete | Phase 2 | ✅ Complete |
| Auth Security Hardened | Phase 2b | ✅ Complete |
| Frontend Auth Proxy & API Integration | Phase 4 | ✅ Complete |
| Core API Ready | Phase 3 | ✅ Complete |
| Marketplace Live | Phase 5 | ✅ Complete |
| All Roles Implemented | Phase 6-8 | 🔄 In Progress |
| Production Ready | Phase 9 | 🔄 Pending |

---

**Last Updated:** 2026-03-07
**Overall Progress:** 66% (6/9 phases complete: 1, 2, 2b, 3, 4, 5)
**Next Milestone:** Complete Phase 6 (Frontend Attendee) - user ticket dashboard
