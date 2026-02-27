# TicketStar - Development Roadmap

## Project Phases Overview

| Phase | Name | Effort | Status | Progress |
|-------|------|--------|--------|----------|
| 1 | Project Scaffolding | 6h | ✅ Complete | 100% |
| 2 | Database & Identity | 10h | ✅ Complete | 100% |
| 3 | Backend API | 16h | 🔄 Pending | 0% |
| 4 | Frontend Auth & Layout | 8h | 🔄 Pending | 0% |
| 5 | Frontend Marketplace | 10h | 🔄 Pending | 0% |
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

## Phase 3: Backend API 🔄 Pending

**Status:** Pending
**Estimated Start:** 2026-02-28
**Effort:** 16 hours
**Dependencies:** Phase 2

### Planned Deliverables

#### Core Services
- [ ] EventService (CRUD + quota logic)
- [ ] TicketService (purchase + QR generation)
- [ ] OrderService (SePay integration)
- [ ] CheckInService (QR validation)

#### Controllers
- [ ] EventsController
- [ ] TicketsController
- [ ] OrdersController
- [ ] CheckInController

#### Caching
- [ ] Redis cache service
- [ ] Distributed lock for ticket quota
- [ ] Cache invalidation strategy

#### Messaging
- [ ] MassTransit setup
- [ ] Email stub consumers (console log)
- [ ] Order confirmation message

#### External Services
- [ ] SePay webhook handler
- [ ] Google token validation

### Success Criteria
- [ ] All CRUD operations functional
- [ ] Ticket quota enforcement (Redis lock)
- [ ] QR code generation with HMAC signature
- [ ] SePay webhook processing
- [ ] RabbitMQ messages published

---

## Phase 4: Frontend Auth & Layout 🔄 Pending

**Status:** Pending
**Estimated Start:** 2026-03-02
**Effort:** 8 hours
**Dependencies:** Phase 1

### Planned Deliverables

#### Authentication
- [ ] Login page (Google OAuth)
- [ ] Magic link request page
- [ ] Auth context/provider
- [ ] Protected route wrapper

#### Layout
- [ ] Root layout with navigation
- [ ] Dashboard layout (sidebar)
- [ ] Responsive design
- [ ] Loading states

#### API Integration
- [ ] API client with fetch wrapper
- [ ] React Query setup
- [ ] Error handling
- [ ] Type definitions

### Success Criteria
- [ ] Google OAuth redirects correctly
- [ ] Magic link form submits
- [ ] Protected routes redirect guests
- [ ] Layout renders on all pages

---

## Phase 5: Frontend Marketplace 🔄 Pending

**Status:** Pending
**Estimated Start:** 2026-03-04
**Effort:** 10 hours
**Dependencies:** Phase 3, Phase 4

### Planned Deliverables

#### Public Pages
- [ ] Home/event listing page
- [ ] Event detail page
- [ ] Ticket tier selection
- [ ] Checkout flow

#### Components
- [ ] EventCard component
- [ ] EventList component
- [ ] TicketSelector component
- [ ] CheckoutForm component
- [ ] OrderConfirmation component

#### Features
- [ ] Event search/filter
- [ ] QR code display after purchase
- [ ] Order status polling

### Success Criteria
- [ ] Browse all events
- [ ] View event details
- [ ] Select tickets
- [ ] Complete checkout (SePay stub)
- [ ] View QR ticket

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
| Auth Functional | Phase 2-4 | ✅ Complete (Phase 2) |
| Core API Ready | Phase 3 | 🔄 In Progress |
| Marketplace Live | Phase 5 | 🔄 Pending |
| All Roles Implemented | Phase 6-8 | 🔄 Pending |
| Production Ready | Phase 9 | 🔄 Pending |

---

**Last Updated:** 2026-02-27
**Overall Progress:** 22% (2/9 phases complete)
**Next Milestone:** Backend API (Phase 3)
