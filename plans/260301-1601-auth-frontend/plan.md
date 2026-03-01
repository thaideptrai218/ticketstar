---
title: "Auth Frontend Implementation"
description: "Build login, register, MFA, magic link pages and auth state management for TicketStar"
status: pending
priority: P1
effort: 12h
branch: main
tags: [auth, frontend, next.js]
created: 2026-03-01
---

# Auth Frontend Implementation Plan

## Overview

Build complete auth UI for TicketStar: login, register, MFA, magic link flows, auth state management, protected routes, and API client with auto-refresh. Backend auth API is complete. Vietnamese UI.

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | Auth API client & types | 1.5h | pending |
| 2 | Auth context & provider | 2h | pending |
| 3 | Login & register pages | 3h | pending |
| 4 | MFA challenge & magic link flows | 2.5h | pending |
| 5 | Protected routes & layout integration | 1.5h | pending |
| 6 | MFA setup page (settings) | 1.5h | pending |

## Architecture

```
frontend/src/
├── lib/
│   ├── auth/
│   │   ├── auth-api-client.ts      # fetch wrappers for /api/auth/*
│   │   ├── auth-types.ts           # request/response types, zod schemas
│   │   └── auth-token-manager.ts   # in-memory token, decode, refresh scheduling
│   └── api-client.ts               # generic fetch with auto-refresh interceptor
├── contexts/
│   └── auth-context.tsx            # AuthProvider, useAuth hook
├── components/
│   └── auth/
│       ├── login-form.tsx
│       ├── register-form.tsx
│       ├── mfa-challenge-form.tsx
│       ├── magic-link-request-form.tsx
│       ├── mfa-setup-wizard.tsx
│       ├── recovery-codes-display.tsx
│       ├── google-login-button.tsx
│       └── protected-route.tsx
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # centered card layout for auth pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── magic-link/verify/page.tsx
│   └── (app)/
│       └── settings/
│           └── security/page.tsx   # MFA setup/disable
└── providers/
    └── app-providers.tsx           # QueryClient + AuthProvider + Toaster
```

## Key Decisions

- **Token storage**: In-memory only (not localStorage) — secure against XSS
- **Refresh strategy**: Schedule refresh ~30s before expiry via setTimeout; intercept 401s as fallback
- **MFA flow**: Login returns mfaToken → redirect to inline MFA form on same page (not separate route)
- **Route protection**: Client-side wrapper component checking auth state; redirect to /login if unauthenticated
- **Providers**: Single `app-providers.tsx` wrapping QueryClientProvider + AuthProvider + Toaster in root layout
- **Google OAuth**: Use `@react-oauth/google` (needs install) or manual GSI script

## Dependencies to Install

- `@react-oauth/google` — Google Sign-In button

## Phase Details

See individual phase files for implementation steps.
