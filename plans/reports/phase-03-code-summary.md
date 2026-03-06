# Phase 3 — Backend API: Code Summary

**Commit:** `14078b1` | **Scope:** Backend only | **+1447 / -2642 lines**

---

## What Was Done

Completed the entire REST API surface for the marketplace. Phase 3 was split across two commits (`799b747` + `14078b1`), both combined here.

---

## New Controllers (API layer)

| Controller | Route | Auth |
|---|---|---|
| `TicketTypesController` | `GET/POST/PUT/DELETE /api/events/{id}/ticket-types` | Organizer |
| `TicketsController` | `GET /api/tickets/my`, `GET /api/tickets/{id}`, `POST /api/tickets/{id}/transfer` | Attendee |
| `StaffController` | `GET/POST/DELETE /api/events/{id}/staff` | Organizer |
| `AdminController` | `POST /api/admin/users/{id}/lock`, `/unlock` | Admin |
| `PayoutController` | `GET /api/payouts/organizer`, `GET /api/payouts/admin` | Organizer/Admin |

**Also updated:** `EventsController` (publish/unpublish), `OrdersController` (refund), `CheckInController`, `WebhooksController` (fixed body double-read).

---

## New Services (Application layer)

| Service | Purpose |
|---|---|
| `TicketTypeService` | CRUD for ticket types, quota validation |
| `TicketService` | List/detail/transfer with HMAC re-signing on transfer |
| `StaffService` | Assign/remove staff per event, role-based listing |
| `AdminService` | Lock/unlock user accounts |
| `PayoutService` | Fee reconciliation views (organizer % + platform cut) |
| `OrderExpiryService` | `BackgroundService` — polls every 60s, cancels expired Pending orders and releases quota |
| `EventService` | Added `UnpublishEvent` |
| `OrderService` | Added `RefundOrder`, fixed payment persistence |

---

## Domain Changes

- Added `OrderStatus.Refunded`, `PaymentStatus.Refunded` enums
- New DTOs: `TicketDtos`, `StaffDtos`, `PayoutDtos`
- New interfaces: `ITicketService`, `ITicketTypeService`, `IStaffService`, `IAdminService`, `IPayoutService`

---

## Migration Cleanup

Collapsed 3 migrations (`InitialCreate`, `AuthHardening`, `UpdateMFASchema`) → single clean `20260305183055_InitialCreate`. Removed ~2200 lines of old migration designer files.

---

## Bug Fixes Applied (Code Review)

- Webhook body double-read → fixed with `EnableBuffering()` + stream reset
- Repo calls in controllers → moved to service layer
- Staff listing missing auth check → added `[Authorize]`
- `pageSize` not capped → capped at 100
- Payment record not persisted → fixed in `OrderService`
- Cancel order not releasing quota → fixed

---

## Key Architecture Points

- `OrderExpiryService` uses `IServiceScopeFactory` to get scoped DB context from singleton
- All controllers inherit `ApiControllerBase` for consistent `ApiResponse<T>` wrapping
- Redis distributed lock (`TicketLockService`) enforces quota atomicity — prevents oversell
- QR payload: `ticketId|eventId|userId|timestamp` + HMAC-SHA256, base64 PNG via QRCoder
