---
title: "Replace TOTP MFA with Email OTP"
description: "Replace authenticator-app TOTP with email-based OTP for simpler MFA UX"
status: pending
priority: P2
effort: 6h
branch: main
tags: [auth, backend, frontend, refactor]
created: 2026-03-02
---

# Replace TOTP MFA with Email OTP

## Overview

Replace the TOTP authenticator-app MFA system with email-based 6-digit OTP. MFA is optional for all roles. Focus on UX simplicity. Email delivery: log-based (same pattern as magic link), real SMTP later.

## Context

- Brainstorm report: `plans/reports/brainstorm-260302-1116-mfa-email-otp-redesign.md`
- Current MFA: TOTP + QR code + recovery codes + AES-256 encryption
- Target MFA: Email OTP + Redis TTL storage, no recovery codes needed

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Backend: Replace MFA service | Pending | 3h | [phase-01](./phase-01-backend-email-otp-service.md) |
| 2 | Frontend: Simplify MFA components | Pending | 2h | [phase-02](./phase-02-frontend-mfa-simplification.md) |
| 3 | Cleanup & migration | Pending | 1h | [phase-03](./phase-03-cleanup-and-migration.md) |

## Dependencies

- Phase 1 → Phase 2 (frontend depends on new API contracts)
- Phase 1 → Phase 3 (migration after service is working)
- Phase 2 and Phase 3 can run in parallel after Phase 1

## Key Decisions

- **No recovery codes** — user requests new email OTP (email IS the recovery channel)
- **Redis OTP storage** — 6-digit code hashed with SHA-256, 5min TTL, rate-limited 1/60s
- **Same endpoint paths** — `/api/auth/mfa/*` unchanged, DTOs change
- **Remove NuGet deps** — OtpNet, QRCoder no longer needed
- **Remove frontend deps** — react-qr-code no longer needed
