# Frontend Architecture Research — TicketStar MVP

**Date:** 2026-02-26 | **Stack:** Next.js 15, TypeScript, Tailwind CSS, .NET 8 REST API

---

## 1. Project Structure — App Router Folder Layout

```
src/
├── app/
│   ├── (public)/                    # No auth required
│   │   ├── layout.tsx               # Public layout (navbar, footer)
│   │   ├── page.tsx                 # Marketplace homepage
│   │   ├── events/
│   │   │   ├── page.tsx             # Event listing / search
│   │   │   └── [slug]/
│   │   │       └── page.tsx         # Event detail + buy tickets
│   │   └── checkout/
│   │       └── page.tsx             # Checkout (redirect to login if unauthed)
│   │
│   ├── (auth)/                      # Auth pages (no header/footer)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── (attendee)/                  # Requires Attendee role
│   │   ├── layout.tsx
│   │   ├── my-tickets/page.tsx      # QR display, download
│   │   └── orders/page.tsx
│   │
│   ├── (organizer)/                 # Requires Organizer role
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── events/
│   │   │   ├── page.tsx             # My events list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   └── analytics/[eventId]/page.tsx
│   │
│   ├── (staff)/                     # Requires Staff role — check-in portal
│   │   ├── layout.tsx
│   │   ├── checkin/page.tsx         # QR scanner UI
│   │   └── checkin/[eventId]/page.tsx
│   │
│   ├── (admin)/                     # Requires Admin role
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   └── events/page.tsx
│   │
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts       # Proxy: sets httpOnly cookie
│   │       ├── logout/route.ts      # Clears cookie
│   │       └── refresh/route.ts     # Token refresh proxy
│   │
│   ├── layout.tsx                   # Root layout (providers)
│   └── globals.css
│
├── components/
│   ├── ui/                          # shadcn/ui primitives
│   ├── events/                      # EventCard, EventGrid, EventFilters
│   ├── tickets/                     # TicketQR, TicketCard
│   ├── checkout/                    # CheckoutForm, PaymentStep
│   └── checkin/                     # QRScanner, CheckinResult
│
├── lib/
│   ├── api-client.ts                # Typed fetch wrapper (base URL, auth headers)
│   ├── auth.ts                      # Token decode, role helpers
│   └── utils.ts
│
├── hooks/                           # useAuth, useQRScanner, useEventSearch
├── types/                           # API response types, domain models
└── middleware.ts                    # Route protection
```

---

## 2. Auth — JWT with httpOnly Cookies (Recommended)

**Decision: httpOnly cookies, NOT localStorage.**

Rationale: XSS cannot steal httpOnly cookies. localStorage is trivially accessible via JS injection — unacceptable for a marketplace handling payments.

### Flow
```
Browser → POST /api/auth/login (Next.js Route Handler)
  → forwards to .NET /auth/login
  → receives { accessToken, refreshToken }
  → sets httpOnly cookies: access_token (15min), refresh_token (7d)
  → returns { user, roles } to client
```

### middleware.ts (route guards)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

const ROLE_ROUTES: Record<string, string[]> = {
  '/organizer': ['Organizer', 'Admin'],
  '/staff':     ['Staff', 'Admin'],
  '/admin':     ['Admin'],
  '/attendee':  ['Attendee', 'Organizer', 'Staff', 'Admin'],
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  const pathname = req.nextUrl.pathname

  const requiredRoles = Object.entries(ROLE_ROUTES)
    .find(([prefix]) => pathname.startsWith(prefix))?.[1]

  if (!requiredRoles) return NextResponse.next()
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  try {
    const { roles } = jwtDecode<{ roles: string[] }>(token)
    if (!roles.some(r => requiredRoles.includes(r)))
      return NextResponse.redirect(new URL('/unauthorized', req.url))
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/(organizer|staff|admin|attendee)/:path*'] }
```

Note: middleware only does JWT decode (no network call) — fast edge execution. Backend validates on actual API calls.

---

## 3. QR Code Libraries

### Display (My Tickets)
**Winner: `react-qr-code`**
- 3.5KB gzipped, SVG output (crisp at any size, printable)
- Pure React, no canvas required
- Usage: `<QRCode value={ticket.qrToken} size={256} />`
- Alternative `qrcode.react` also fine but slightly heavier

### Scanning (Check-in Portal)
**Winner: `@zxing/browser`**
- TypeScript-first, maintained by Zxing community
- Supports continuous scanning via `BrowserMultiFormatReader`
- Works well on mobile Chrome/Safari
- `html5-qrcode` is popular but has quirky React integration and larger bundle
- Key: check-in portal is a **Client Component** (needs camera access)

```typescript
// hooks/use-qr-scanner.ts — simplified
import { BrowserMultiFormatReader } from '@zxing/browser'

export function useQRScanner(onResult: (text: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
      if (result) onResult(result.getText())
    })
    return () => reader.reset()
  }, [])
  return videoRef
}
```

---

## 4. State Management Strategy

### Rule: Server Components first, Client Components only when necessary

| Page | Component Type | Data Fetching |
|------|---------------|---------------|
| Homepage/Event listing | Server Component | `fetch()` with `cache: 'revalidate'` (ISR) |
| Event detail | Server Component | SSR (SEO critical) |
| My tickets | Server Component | SSR (auth, personalized) |
| Organizer dashboard | Server Component | SSR |
| Checkout form | Client Component | React Query mutations |
| QR scanner | Client Component | React Query mutations (POST check-in) |
| Event search/filter | Client Component | React Query (SWR-like refetch) |

### API Calls
- **React Query (`@tanstack/react-query`)** for client-side: mutations, real-time invalidation, optimistic updates
- **Native `fetch()`** in Server Components — no library needed
- **Do NOT** use SWR — React Query has better TS support and more features for same cost

### Forms
**React Hook Form** — lightest approach, great TS support, integrates with shadcn/ui form components
- Zod for schema validation
- `useForm<CheckoutSchema>` pattern

---

## 5. UI Component Library

**shadcn/ui + Tailwind CSS** — correct choice for MVP speed.

Key components needed (install only what's used):
```
Button, Input, Form, Card, Badge, Dialog, Sheet (mobile drawer),
Tabs, Table, Select, Skeleton, Toast (Sonner), Avatar, Separator
```

Pattern: shadcn components in `src/components/ui/`, domain components wrap them.

---

## 6. Data Fetching Strategy Per Key Page

| Page | Strategy | Reason |
|------|----------|--------|
| `/` marketplace | ISR `revalidate: 60` | Public, SEO, low churn |
| `/events/[slug]` | SSR | SEO critical, real-time availability |
| `/checkout` | CSR + React Query | Dynamic, auth-gated, payment state |
| `/my-tickets` | SSR | Auth-gated, show after redirect |
| `/organizer/dashboard` | SSR + React Query refetch | Stats need freshness |
| `/checkin/[eventId]` | CSR only | Camera, real-time, no SSR value |
| `/admin` | SSR | Sensitive, server-side auth check |

---

## 7. API Client Pattern

```typescript
// lib/api-client.ts
const BASE = process.env.NEXT_PUBLIC_API_URL // e.g. https://api.ticketstar.com

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include', // sends httpOnly cookie
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}
```

Server Components pass the cookie header manually via `cookies()` from `next/headers`.

---

## Key Decisions Summary

| Concern | Decision |
|---------|----------|
| JWT storage | httpOnly cookie via Next.js route handler proxy |
| Route protection | middleware.ts edge function, decode-only |
| QR display | `react-qr-code` (SVG, lightweight) |
| QR scanning | `@zxing/browser` (TS-first, mobile-ready) |
| Client state | React Query only where needed |
| Forms | React Hook Form + Zod |
| UI | shadcn/ui + Tailwind |
| Default rendering | Server Components, CSR only for interactive |

---

## Unresolved Questions

1. Does .NET backend support refresh token rotation? If not, UX on token expiry will be poor (forced logout).
2. Payment provider for checkout — Stripe Elements (Client Component) or redirect flow? Affects checkout page architecture significantly.
3. Will check-in portal be used offline (events in poor-connectivity venues)? If yes, consider PWA + IndexedDB for local attendee list cache.
4. Multi-tenant? Does one organizer see another's events in the organizer dashboard, or is this strictly isolated?
5. Is SSO / social login required, or username/password only for MVP?
