# TicketStar - Codebase Summary

## Overview

TicketStar is a full-stack ticketing marketplace with:
- **.NET 8 Backend** (`backend/`) — Layered architecture (API/Application/Domain/Infrastructure)
- **Next.js 15 Frontend** (`frontend/`) — Server/client components, auth proxy, role-based routing
- **Infrastructure** (`docker-compose.yml`) — MySQL 8, Redis 7, RabbitMQ 3

This document summarizes the **frontend codebase** with focus on Phase 4 auth architecture.

---

## Frontend Directory Structure

```
frontend/src/
├── app/                              # Next.js 15 App Router
│   ├── (auth)/                       # Auth route group (public)
│   │   ├── layout.tsx                # Auth layout (no sidebar)
│   │   ├── login/page.tsx            # Email/password + Google OAuth login
│   │   ├── register/page.tsx         # User registration
│   │   └── magic-link/
│   │       └── verify/page.tsx       # Magic link verification
│   │
│   ├── (app)/                        # Protected app routes
│   │   └── settings/
│   │       └── security/
│   │           └── page.tsx          # MFA setup/disable page
│   │
│   ├── (organizer)/                  # Role-based: Organizer + Admin
│   │   └── ... (planned)
│   │
│   ├── (admin)/                      # Role-based: Admin only
│   │   └── ... (planned)
│   │
│   ├── (attendee)/                   # Role-based: Attendee + Admin
│   │   └── ... (planned)
│   │
│   ├── (staff)/                      # Role-based: Staff + Admin + Organizer
│   │   └── ... (planned)
│   │
│   ├── api/
│   │   └── auth/                     # Proxy to backend auth endpoints
│   │       ├── _proxy-helpers.ts     # Cookie + bearer token helpers
│   │       ├── login/route.ts
│   │       ├── register/route.ts
│   │       ├── refresh/route.ts
│   │       ├── logout/route.ts
│   │       ├── me/route.ts           # Current user endpoint
│   │       ├── google/route.ts
│   │       ├── magic-link/
│   │       │   ├── request/route.ts
│   │       │   └── verify/route.ts
│   │       ├── revoke-all/route.ts
│   │       └── mfa/
│   │           ├── setup/route.ts
│   │           ├── verify-setup/route.ts
│   │           ├── challenge/route.ts
│   │           └── disable/route.ts
│   │
│   ├── unauthorized/                 # 403 error page
│   │   └── page.tsx
│   │
│   ├── layout.tsx                    # Root layout (auth provider, sidebar)
│   └── page.tsx                      # Landing page
│
├── components/
│   ├── auth/                         # Auth-specific components
│   │   ├── login-form.tsx            # Email/password form
│   │   ├── register-form.tsx         # Registration form
│   │   ├── google-login-button.tsx   # Google OAuth button
│   │   ├── magic-link-request-form.tsx
│   │   ├── mfa-challenge-form.tsx    # TOTP/recovery code form
│   │   ├── mfa-setup-wizard.tsx      # QR code + verify setup
│   │   ├── recovery-codes-display.tsx# MFA recovery codes
│   │   ├── password-input.tsx        # Reusable password field
│   │   ├── protected-route.tsx       # Route guard wrapper
│   │   ├── user-menu.tsx             # Profile + logout menu
│   │   └── ...
│   │
│   ├── ui/                           # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── toast.tsx
│   │   └── ... (15+ components)
│   │
│   ├── layout/                       # Layout components
│   │   ├── app-sidebar.tsx           # Dashboard sidebar (role-based)
│   │   └── ...
│   │
│   ├── events/                       # Event components (planned)
│   ├── tickets/                      # Ticket components (planned)
│   ├── checkout/                     # Checkout flow (planned)
│   └── ...
│
├── contexts/
│   └── auth-context.tsx              # Global auth state + user hydration
│
├── hooks/                            # Custom React hooks (planned)
│   └── ... (useQuery, useMutation, etc.)
│
├── lib/
│   ├── api-client.ts                 # Browser API fetch with auto-refresh
│   ├── api-server.ts                 # Server-side API fetch
│   │
│   ├── auth/
│   │   ├── auth-api-client.ts        # Typed auth endpoint calls
│   │   ├── auth-token-manager.ts     # Token lifecycle + storage
│   │   └── auth-types.ts             # Auth request/response DTOs
│   │
│   ├── utils.ts                      # Helper functions
│   └── ...
│
├── types/
│   ├── api.ts                        # ApiResponse<T>, PagedResult<T>
│   └── ... (API response types)
│
└── middleware.ts                     # Route protection + role-based redirect

```

---

## Key Architecture Components

### 1. Authentication Proxy Layer (`app/api/auth/*`)

All auth requests flow through Next.js proxy routes (never directly to backend):

```
Browser → POST /api/auth/login → Proxy → POST /auth/login-email → Backend
                                         ↓
                                    Sets Set-Cookie: ts_at
                                    (httpOnly, Secure, SameSite=Strict)
                                         ↓
                                    Returns response
                                         ↓
                                    Browser receives cookie
```

**Proxy Endpoints:**
| Route | Proxy To | Purpose |
|-------|----------|---------|
| `/api/auth/login` | `POST /auth/login-email` | Email/password login |
| `/api/auth/register` | `POST /auth/register` | New user registration |
| `/api/auth/google` | `POST /auth/google` | Google OAuth |
| `/api/auth/refresh` | `POST /auth/refresh` | Token refresh |
| `/api/auth/logout` | `POST /auth/logout` | Session termination |
| `/api/auth/me` | `GET /api/users/me` | Current user |
| `/api/auth/magic-link/request` | `POST /auth/magic-link/request` | Request magic link |
| `/api/auth/magic-link/verify` | `POST /auth/magic-link/verify` | Verify magic link |
| `/api/auth/mfa/setup` | `POST /mfa/setup` | MFA setup request |
| `/api/auth/mfa/verify-setup` | `POST /mfa/verify-setup` | Confirm TOTP setup |
| `/api/auth/mfa/challenge` | `POST /mfa/challenge` | TOTP verification |
| `/api/auth/mfa/disable` | `POST /mfa/disable` | Disable MFA |
| `/api/auth/revoke-all` | `POST /auth/revoke-all` | Logout all sessions |

**Cookie Management:**
- `ts_at` (Access Token): 5min expiry, httpOnly, Secure, SameSite=Strict
- `refresh_token`: 7d expiry, httpOnly, Secure, SameSite=Strict, Path=/api/auth

Browser never sees tokens in JavaScript (XSS protection).

### 2. Route Protection (`middleware.ts`)

Middleware runs on every request to protected routes (`/organizer`, `/admin`, `/attendee`, `/staff`):

```typescript
// middleware.ts logic:
1. Decode JWT from ts_at cookie (no signature verification — UX guard only)
2. Check expiration
3. Extract role claim
4. Validate role against required roles for route
5. Redirect to /login (if missing token) or /unauthorized (if insufficient role)
```

**Protected Routes:**
```
/organizer  → Requires: Organizer, Admin
/admin      → Requires: Admin
/attendee   → Requires: Attendee, Admin
/staff      → Requires: Staff, Admin, Organizer
```

### 3. Client-Side Fetching

**Browser Fetch (`lib/api-client.ts`):**
```typescript
apiFetch<T>(path, init)
  ├─ Calls backend directly: ${BASE_URL}${path}
  ├─ credentials: 'include' (auto-sends ts_at cookie)
  ├─ On 401: triggers concurrent-safe refresh
  │          (multiple parallel requests share one refresh attempt)
  └─ Retries on successful refresh
```

**Server Fetch (`lib/api-server.ts`):**
```typescript
apiFetchServer<T>(path, init)
  ├─ Server component only
  ├─ Forwards cookies from incoming request
  ├─ No retry logic (synchronous context)
  └─ No credentials header (cookies handled by HTTP layer)
```

**Auth API Client (`lib/auth/auth-api-client.ts`):**
```typescript
authApi.login(data)      // POST /api/auth/login
authApi.register(data)   // POST /api/auth/register
authApi.googleLogin(data) // POST /api/auth/google
authApi.mfaChallenge(data) // POST /api/auth/mfa/challenge
// ... etc
```

### 4. Auth State Management (`contexts/auth-context.tsx`)

```typescript
AuthProvider
  ├─ Hydrates user on mount via GET /api/auth/me
  │  (Reads ts_at cookie, no JS storage)
  │
  ├─ Provides:
  │  ├─ user: AuthUser | null
  │  ├─ isAuthenticated: boolean
  │  ├─ isLoading: boolean
  │  ├─ refreshUser(): Promise<void>
  │  └─ logout(): Promise<void>
  │
  └─ useAuth() hook for child components
```

### 5. Type Definitions

**API Response Wrapper (`types/api.ts`):**
```typescript
ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  errors?: Record<string, string[]>
}

PagedResult<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
}
```

**Auth Types (`lib/auth/auth-types.ts`):**
```typescript
AuthUser {
  id: string
  email: string
  displayName: string
  role: 'Admin' | 'Organizer' | 'Staff' | 'Attendee'
  mfaEnabled: boolean
}

LoginResponse {
  mfaRequired?: boolean
  mfaToken?: string
  user?: AuthUser
}

MfaSetupResponse {
  qrCode: string
  secret: string
}

// ... and all request DTOs
```

---

## Auth Flow Walkthrough

### Registration
```
1. User fills register-form.tsx
2. onSubmit → authApi.register({ email, password, displayName })
3. POST /api/auth/register (proxy)
4. Proxy forwards: POST /auth/register
5. Backend hashes password (Argon2), creates user
6. Backend generates JWT + refresh token
7. Sets Set-Cookie: ts_at in response
8. Browser receives httpOnly cookie
9. Component calls refreshUser() to hydrate AuthContext
10. Redirect to dashboard
```

### Login with MFA
```
1. User submits login-form.tsx
2. authApi.login({ email, password })
3. Backend responds:
   - If MFA disabled: { user, mfaRequired: false }
   - If MFA enabled: { mfaRequired: true, mfaToken }
4. If MFA required:
   - Show mfa-challenge-form.tsx
   - User enters TOTP code
5. authApi.mfaChallenge({ code, mfaToken })
6. Backend validates TOTP, sets ts_at cookie
7. AuthContext refreshes user
8. Redirect to dashboard
```

### Protected Route Access
```
1. User navigates to /organizer/dashboard
2. middleware.ts intercepts
3. Reads ts_at cookie
4. Decodes JWT (checks exp, extracts role)
5. Validates role against /organizer requirements (Organizer, Admin)
6. If valid: NextResponse.next() → Page renders
7. If invalid:
   - Missing token → Redirect /login?returnUrl=/organizer/dashboard
   - Insufficient role → Redirect /unauthorized
```

### Auto-Refresh on 401
```
1. apiFetch<T>('/api/events') called
2. Browser sends ts_at cookie
3. Backend responds 401 (token expired)
4. apiFetch detects 401
5. Calls attemptRefresh() (concurrent-safe queue)
6. POST /api/auth/refresh → proxy forwards refresh_token cookie to backend
7. Backend validates refresh token, rotates pair (returns new ts_at + refresh_token)
8. Proxy re-sets both cookies (path=/, sameSite=lax) via extractRefreshTokenFromResponse()
9. apiFetch retries original request with new ts_at
10. Success!
```

**Cookie extraction**: All auth proxy routes use `extractRefreshTokenFromResponse()` which tries `Headers.getSetCookie()` first, falls back to `headers.get('set-cookie')` — handles Next.js fetch patching compatibility.
**Consistency**: All login paths (login, register, google, magic-link, mfa/challenge) set `refresh_token` with `path=/; sameSite=lax` instead of forwarding backend's `path=/api/auth; sameSite=strict`.

---

## Security Guarantees

| Layer | Mechanism | Threat |
|-------|-----------|--------|
| **Browser → Proxy** | HttpOnly cookies | XSS token theft |
| **Proxy → Backend** | Signature validation (backend) | Token forgery |
| **Token Blacklist** | Redis (backend) | Revoked token reuse |
| **Refresh Rotation** | Token family tracking | Refresh token compromise |
| **Grace Period** | 10-second window (backend) | Multi-tab race conditions |
| **Rate Limiting** | Redis-backed sliding window | Brute force attacks |
| **Account Lockout** | 5 failed attempts → 15min lock | Password guessing |

---

## Development Status

| Feature | Status | Phase |
|---------|--------|-------|
| Auth pages (login, register, magic-link) | ✅ Complete | 4 |
| Auth proxy routes | ✅ Complete | 4 |
| Middleware + role-based routing | ✅ Complete | 4 |
| Auth context + user hydration | ✅ Complete | 4 |
| MFA setup/challenge UI | ✅ Complete | 4 |
| Browser API client (auto-refresh) | ✅ Complete | 4 |
| Server API client | ✅ Complete | 4 |
| shadcn/ui components | ✅ Complete | 4 |
| Landing page | ✅ Complete | 4 |
| Event listing (marketplace) | ✅ Complete | 5 |
| Event detail (SSR + SEO) | ✅ Complete | 5 |
| Checkout flow (protected) | ✅ Complete | 5 |
| Order polling & QR display | ✅ Complete | 5 |
| My Tickets page (QR codes, transfer) | ✅ Complete | 6 |
| Order history & detail pages | ✅ Complete | 6 |
| Ticket transfer dialog | ✅ Complete | 6 |
| Vietnamese UI labels | ✅ Complete | 6 |
| Organizer dashboard (stats, events, TT, orders, check-in, staff, payout) | ✅ Complete | 7 |
| Organizer event CRUD pages | ✅ Complete | 7 |
| **Organizer event wizard (4-step multi-form)** | ✅ **Complete** | **7.5** |
| Staff check-in portal (QR scanner + manual entry) | ✅ Complete | 8 |
| Admin dashboard & user management | ✅ Complete | 8 |

---

## File Size Reference

| File | LOC | Purpose |
|------|-----|---------|
| `auth-context.tsx` | 73 | Global auth state |
| `auth-api-client.ts` | 135 | Typed auth endpoints |
| `api-client.ts` | 75 | Browser fetch + refresh |
| `api-server.ts` | 50 | Server-side fetch |
| `auth-types.ts` | 80+ | Request/response DTOs |
| `proxy.ts` | 63 | Route guard logic (imported by `middleware.ts`) |
| `_proxy-helpers.ts` | ~78 | Cookie helpers — `extractRefreshTokenFromResponse()` with `getSetCookie` fallback |

---

## Phase 5: Frontend Marketplace

### Public Route Group (`(public)`)

```
frontend/src/app/
├── (public)/
│   ├── page.tsx                    # Landing page (hero, features, events)
│   └── events/
│       ├── page.tsx                # Event listing (CSR, search + filters)
│       ├── [slug]/
│       │   ├── page.tsx            # Event detail (SSR, metadata)
│       │   └── event-detail-client.tsx # Client interactivity
```

**Key Features:**
- **Event Listing** (`/events`): CSR with `useEventSearch` hook (debounced, URL-synced filters)
- **Event Detail** (`/events/[slug]`): SSR with `generateMetadata()` for OpenGraph/Twitter cards
- **Client-Side Rendering:** Event listing uses interactive filters; landing page integrates featured events

### Marketplace Components

```
components/
├── events/
│   ├── event-card.tsx              # Card UI (image, title, date, price, availability)
│   ├── event-grid.tsx              # Grid layout (responsive, pagination)
│   ├── event-filters.tsx           # Search, category, date range, price filters
│   └── ticket-type-selector.tsx    # Quantity picker for each ticket tier
│
└── checkout/
    ├── checkout-form.tsx           # Form (email validation, tier selection)
    └── payment-status.tsx          # Order polling + QR code display
```

### Protected Checkout (`(app)`)

```
frontend/src/app/
└── (app)/
    └── checkout/
        └── page.tsx                # Checkout (ProtectedRoute wrapper)
```

**Architecture:**
- Checkout route protected by `ProtectedRoute` wrapper (requires authentication)
- Under `(app)` layout (shows sidebar)
- Form submission → POST /api/orders/create
- Order polling via `useCheckout` hook (2s interval, 2min max, recursive setTimeout)

### Custom Hooks

```
hooks/
├── useEventSearch.ts               # Debounced search, URL-synced filters
└── useCheckout.ts                  # Order polling state machine, QR handling
```

**useEventSearch:**
- Debounced (500ms) search input
- Syncs filters to URL query params
- Returns: events[], isLoading, totalCount, pagination controls

**useCheckout:**
- Polls POST /api/orders/{orderId}/status every 2s
- Max 2min polling (60 requests)
- Handles 409 conflict (sold-out gracefully)
- Returns: order state, QR code URL, payment status

### Format Utilities

```
lib/utils.ts
├── formatPrice(amount, currency)    # $12.99 format
├── formatDate(date)                 # Mar 15, 2026
└── formatTime(date)                 # 7:30 PM
```

### Types

```
types/api.ts
├── Event                            # EventId, Name, Description, Date, Price, Quota
├── TicketType                       # TierId, Name, Price, Quantity, Available
├── Order                            # OrderId, Status, Items[], Total, QrCode
├── CreateOrderRequest               # { eventId, items: [ { ticketTypeId, quantity } ] }
└── OrderStatusResponse              # { status, qrCode?, message? }
```

### SEO & Metadata

Event detail page uses Next.js `generateMetadata()`:

```typescript
// /events/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const event = await fetchEventDetail(params.slug);
  return {
    title: event.name,
    description: event.description,
    openGraph: {
      title: event.name,
      description: event.description,
      images: [{ url: event.imageUrl }],
      type: 'website',
    },
  };
}
```

### Order Polling Implementation

```typescript
// Recursive setTimeout (no overlapping requests)
const pollOrder = async () => {
  const response = await apiFetch(`/api/orders/${orderId}/status`);

  if (response.status === 'completed') {
    setPaymentStatus('success');
    setQrCode(response.qrCode);
    return; // Stop polling
  }

  if (response.status === 'pending') {
    setTimeout(pollOrder, 2000); // Next poll in 2s
  }
};
```

**409 Conflict Handling:**
- When ticket type is sold out: Handle gracefully with user-friendly message
- Don't retry; show "Sold out" and suggest alternative tiers

## Phase 6: Frontend Attendee

### Attendee Route Group (`(attendee)`)

```
frontend/src/app/
├── (attendee)/
│   ├── layout.tsx                      # Horizontal tab nav (My Tickets, Orders, Settings)
│   └── attendee/
│       ├── my-tickets/
│       │   └── page.tsx                # Ticket grid with QR display
│       ├── orders/
│       │   ├── page.tsx                # Order history list
│       │   └── [id]/
│       │       └── page.tsx            # Order detail page
│       └── settings/
│           └── page.tsx                # Redirect to /settings/security
```

### Attendee Components

```
components/
├── tickets/
│   ├── ticket-card.tsx                 # Ticket display (image, date, venue, QR, transfer button)
│   ├── ticket-qr-display.tsx           # QR code modal (base64 PNG, click-to-enlarge)
│   └── ticket-transfer-dialog.tsx      # Transfer form (email input, zod validation)
│
└── orders/
    ├── order-card.tsx                  # Order list item (ID, date, status badge, total)
    └── order-detail.tsx                # Full order details (items, payment, cancel action)
```

### Attendee Types

```
types/
├── tickets.ts                          # MyTicket, TicketDetail, TransferTicketRequest
└── api.ts                              # Order, OrderItem, OrderStatus

lib/
└── order-status-config.ts              # Status badge colors (Pending, Paid, Delivered, Cancelled)
```

### Key Features

- **My Tickets:** Grid layout with QR code display (base64 PNG from backend)
- **Ticket Transfer:** Modal dialog with email recipient + zod validation
- **Order History:** Paginated list with color-coded status badges
- **Order Detail:** Full breakdown (items, total, payment info, timestamps)
- **Responsive:** Mobile-first layout with horizontal tab navigation
- **Localization:** Vietnamese UI labels throughout (Vé của tôi, Đơn hàng, Cài đặt)

### Security & Design Notes

- All pages auth-gated via middleware (attendee role required)
- Transfer requires ticket ownership validation (backend)
- Cancel button for Pending orders only
- Refund deferred to organizer-only endpoint (not in attendee UI)
- QR codes: base64 PNG from backend (consistent with checkout flow)
- All files <200 LOC, modular components

---

## Phase 6: Frontend Attendee Components

### Attendee Components

```
components/
├── tickets/
│   ├── ticket-card.tsx                 # Ticket display (QR, transfer button)
│   ├── ticket-qr-display.tsx           # Base64 PNG QR renderer + dialog
│   └── ticket-transfer-dialog.tsx      # Email transfer form (zod validation)
│
└── orders/
    ├── order-card.tsx                  # Order list item + status badge
    └── order-detail.tsx                # Full order with items + cancel action
```

### Attendee Pages

```
app/(attendee)/
├── layout.tsx                          # No redundant tabs (uses global navbar)
└── attendee/
    ├── my-tickets/page.tsx             # Ticket grid with QR codes
    ├── orders/page.tsx                 # Order history (paginated)
    ├── orders/[id]/page.tsx            # Order detail with cancel
    └── settings/page.tsx               # Redirect to /settings/security
```

### Key Features

- **My Tickets:** Card grid with base64 PNG QR codes (click-to-enlarge Dialog)
- **Ticket Transfer:** Modal dialog, email input, zod validation
- **Order History:** Paginated list with color-coded status badges
- **Order Detail:** Full breakdown (items, payment, timestamps, cancel button)
- **Responsive:** Mobile-first with global navbar
- **Localization:** Vietnamese UI throughout (Vé của tôi, Đơn hàng, Cài đặt)

### Auth Fixes (Session 8)

**Proxy & Cookie Handling:**
- Backend JWT: Added `OnMessageReceived` hook to read `ts_at` cookie (was only checking Authorization header)
- Cookie paths: proxy routes set cookies with `path=/` (backend default `/api/auth` caused scope issues)
- Auto-refresh: `fetchCurrentUser()` now retries on 401 after token refresh

**Role Mapping:**
- Proxy role guard: Added `"User"` to attendee routes (backend enum is `UserRole.User`, not `"Attendee"`)
- User menu: Fixed attendee role label display

**UI Polish:**
- Navbar: Shrink-on-scroll effect, role-based link visibility
- Footer: Sticky bottom with flex layout
- All English text → Vietnamese across 10+ files
- Notification bell placeholder in navbar

## Phase 7: Frontend Organizer

### Organizer Route Group (`(organizer)`)

```
frontend/src/app/
├── (organizer)/
│   ├── dashboard/
│   │   └── page.tsx                    # Stats cards + recent events
│   ├── events/
│   │   ├── page.tsx                    # Event list (publish/unpublish)
│   │   ├── new/
│   │   │   └── page.tsx                # Create event form
│   │   └── [id]/
│   │       ├── edit/page.tsx           # Edit event
│   │       ├── ticket-types/page.tsx   # Ticket type CRUD
│   │       ├── orders/page.tsx         # Event orders table
│   │       ├── checkin/page.tsx        # Check-in stats (10s auto-refresh)
│   │       └── staff/page.tsx          # Staff management
│   └── payout/
│       ├── page.tsx                    # Payout summary (all events)
│       └── [eventId]/page.tsx          # Payout detail (per event)
```

### Organizer Components

```
components/organizer/
├── event-stats-card.tsx                # Dashboard card (title, value, trend)
├── event-wizard/                       # 4-Step event creation wizard (NEW)
│   ├── event-wizard.tsx                # Wizard orchestrator (state management)
│   ├── wizard-stepper.tsx              # Step indicator component
│   ├── step-1-event-info.tsx           # Event name, description, image
│   ├── step-2-time-tickets.tsx         # Date/time, ticket types
│   ├── step-3-settings.tsx             # Online/venue, max per order, warnings
│   ├── step-4-payment.tsx              # Refund policy, payment terms
│   ├── ticket-type-modal.tsx           # Add/edit ticket tiers
│   ├── image-upload-zone.tsx           # Banner image upload via dropzone
│   ├── rich-text-editor.tsx            # TipTap rich editor wrapper
│   └── rich-text-editor-inner.tsx      # TipTap inner component
├── ticket-type-form.tsx                # Dialog-based form (legacy)
├── ticket-type-list.tsx                # Table with edit/delete
├── orders-table.tsx                    # Paginated orders per event
├── staff-management.tsx                # Assign/remove staff
└── payout-summary-card.tsx             # Revenue breakdown card
```

**Replaced Component:**
- `event-form.tsx` → Superseded by 4-step `event-wizard/` (formerly single-form, now multi-step)

### Key Features

- **Dashboard:** Stats cards (total events, orders, revenue), quick links
- **Event CRUD:** Create, edit, publish/unpublish
- **Ticket Types:** Add/edit/delete tiers via dialog
- **Orders View:** Table showing per-event orders (status, buyer, amount)
- **Check-in Stats:** Realtime ticket type breakdown (checked in / total) — 10s refresh
- **Staff Management:** Assign/remove staff per event
- **Payout:** Summary of all events + detail per event (breakdown by tier, platform fee)

---

## Phase 7.5: Event Wizard Enhancement

Organizer event creation now uses a guided 4-step wizard (replacing single-form `event-form.tsx`):
- **Step 1:** Event info (name, description, banner image via dropzone)
- **Step 2:** Date/time + ticket types (modal for adding tiers)
- **Step 3:** Settings (online toggle, max per order, content warning)
- **Step 4:** Payment (refund policy, payment terms)

See `docs/system-architecture.md` Event Wizard section for full architecture & data flow.

**New Packages:** `@tiptap/react`, `@tiptap/starter-kit`, `react-dropzone`
**New Backend:** `POST /api/files/upload` (FilesController.cs)
**DB Updates:** Event & TicketType entities + new fields

---

## Phase 8: Frontend Staff & Admin

### Staff Route Group (`(staff)`)

```
frontend/src/app/
├── (staff)/
│   └── checkin/
│       ├── page.tsx                    # Event selection
│       └── [eventId]/page.tsx          # Scanner UI (QR + manual)
```

### Admin Route Group (`(admin)`)

```
frontend/src/app/
├── (admin)/
│   ├── dashboard/
│   │   └── page.tsx                    # Platform stats (users, events, orders)
│   └── users/
│       └── page.tsx                    # User list with lock/unlock
```

### Staff & Admin Components

```
components/checkin/
├── checkin-result.tsx                  # Result display (success/duplicate/error)
└── manual-code-entry.tsx               # Fallback text input

components/admin/
└── users-table.tsx                     # User list with actions

hooks/
└── use-qr-scanner.ts                   # @zxing/browser wrapper
```

### Key Features

**Staff Check-in:**
- Event selection dropdown (staffing-assigned events)
- QR scanner with camera feed (continuous scanning via @zxing/browser)
- Manual code entry fallback (text input)
- CheckinResult shows: success (green), duplicate (orange), error (red)
- Auto-reset after 3s for next scan
- Running stats display (total/checked-in per ticket type)

**Admin Dashboard:**
- Overview cards (total users, events, orders)
- User management table with lock/unlock per user

---

## Next Steps (Phase 9+)

1. **Phase 9** — E2E & unit tests (Playwright, xUnit)
2. **Deployment** — Docker/Kubernetes for production

---

**Last Updated:** 2026-03-08
**Phase:** 8 Complete + 7.5 Event Wizard
**Coverage:** 4/4 roles fully implemented + Enhanced organizer event creation wizard
