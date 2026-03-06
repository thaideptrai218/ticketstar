# Code Review: Phase 3 Backend API

**Date:** 2026-03-06
**Reviewer:** code-reviewer
**Scope:** All Phase 3 controllers, services, DTOs, DI registration
**Files:** ~20 files | ~1500 LOC new/modified
**Build:** Passed (0 errors, 0 warnings)

## Overall Assessment

Solid implementation following established patterns (Result<T>, ApiControllerBase, UnitOfWork). Auth checks consistent. DI registration complete. Several issues found ranging from critical (security) to medium (data integrity, code quality).

---

## Critical Issues

### C1. Webhook body already consumed before manual read (WebhooksController.cs:34)

`[FromBody] SePayWebhookRequest request` binds the request body via model binding. Then `Request.Body` is read again with `StreamReader` on line 34-35 — this will return an **empty string** because the body stream was already consumed. The `jsonPayload` passed to `ProcessSePayWebhookAsync` will always be empty.

**Fix:** Either use `[FromBody]` and serialize the request object back to JSON for signature validation, or remove `[FromBody]` and read the raw body manually (with `EnableBuffering`).

```csharp
// Option A: Remove [FromBody], read raw
[HttpPost("sepay")]
public async Task<IActionResult> SePayWebhook(CancellationToken ct)
{
    Request.EnableBuffering();
    using var reader = new StreamReader(Request.Body);
    var jsonPayload = await reader.ReadToEndAsync(ct);
    // ...validate signature with jsonPayload, then deserialize manually
}
```

### C2. Test webhook bypasses signature validation (WebhooksController.cs:48-61)

`TestSePayWebhook` sends a fake signature `"test-signature"` to `ProcessSePayWebhookAsync`, which calls `ValidateSignature`. If validation is strict, this always fails. If it passes, it means signature validation is broken. Either way this endpoint is problematic and should not exist in production.

**Fix:** Remove or restrict to Development environment only via `#if DEBUG` or `[ApiExplorerSettings(IgnoreApi = true)]` + environment check.

### C3. GetEventStaff has no authorization check (StaffController.cs:20-24)

Any authenticated user can list all staff for any event. Should verify caller is organizer or staff of that event.

### C4. Refund endpoint allows any ticket owner to self-refund (OrdersController.cs:49)

`RefundOrderAsync` only checks `order.UserId == userId` — any buyer can refund their own paid order without organizer/admin approval. This is a financial risk.

**Fix:** Refund should require Organizer or Admin role, not the buyer.

---

## High Priority

### H1. Distributed lock acquired inside loop but may not release on early return (OrderService.cs:71-78)

Locks are acquired per ticket type in a `foreach` loop. If the second item fails availability check, the first lock's `await using` scope hasn't ended yet (still in the foreach body). The `await using` should work correctly due to compiler-generated disposal, but the pattern is fragile — if an exception occurs between acquiring lock for item N and the try/catch block, tickets for items 1..N-1 have already had `IncrementSoldCountAsync` called (line 108) but the order creation fails silently.

**Recommendation:** Wrap the entire order creation (lines 62-153) in a transaction with rollback capability, or accumulate all locks first before incrementing counts.

### H2. TicketTypesController has repository calls directly in controller (TicketTypesController.cs)

This violates the layered architecture (API -> Application -> Domain). All other controllers delegate to services. TicketTypesController directly uses `IEventRepository`, `ITicketTypeRepository`, and `IUnitOfWork`.

**Fix:** Create `ITicketTypeService` and move logic there.

### H3. AdminController has repository calls directly in controller (AdminController.cs)

Same layering violation as H2. Uses `IUserRepository` and `IUnitOfWork` directly.

### H4. Quota can be reduced below SoldCount (TicketTypesController.cs:91)

`UpdateTicketType` allows setting `Quota` to any value, even below current `SoldCount`. This creates negative availability.

**Fix:** Add validation: `if (request.Quota.HasValue && request.Quota.Value < ticketType.SoldCount) return error`.

### H5. No input validation on pageSize (AdminController.cs:24, EventsController.cs:23)

`pageSize` parameter has no upper bound. A request with `pageSize=1000000` could cause memory/performance issues.

**Fix:** Clamp to reasonable max (e.g., 100).

### H6. PayoutService loads all orders into memory for revenue calc (PayoutService.cs:35-38)

The LINQ query `_orderRepo.Query().Include(o => o.Items).Where(...)` loads full order entities with items. This doesn't scale. Also, the `paidOrders` variable is never used — the breakdown uses `tt.SoldCount` instead.

**Fix:** Remove the unused query (lines 35-38). Revenue is already calculated from `SoldCount * Price`.

---

## Medium Priority

### M1. Hardcoded magic numbers in TicketTypeResponse

`""` (empty description) and `10` (max per order?) appear as hardcoded positional args throughout (TicketTypesController.cs:36, 69, 99; EventService.cs:298-304). These should be actual field values or named constants.

### M2. GetUserId() ?? "" pattern repeated everywhere

If `GetUserId()` returns null (shouldn't happen behind `[Authorize]`), passing `""` as userId silently bypasses ownership checks. Should throw or return 401.

### M3. Refund sets order status to Cancelled instead of Refunded (OrderService.cs:361)

`RefundOrderAsync` sets `order.Status = OrderStatus.Cancelled` — should be a distinct `Refunded` status for proper state tracking. `PaymentStatus.Refunded` exists but `OrderStatus.Refunded` does not.

### M4. EventService.cs exceeds 200 LOC limit (372 lines)

Per project conventions, files should be under 200 LOC. Cache helper methods could be extracted to a shared cache service.

### M5. Event deletion doesn't check for existing orders/tickets

`DeleteEventAsync` allows deleting events that may have sold tickets and active orders, causing orphaned data.

### M6. OrderExpiryService processes all expired orders in single SaveChanges

If one order's `IncrementSoldCountAsync` fails, entire batch rolls back. Should process individually with per-order error handling.

### M7. ListEvents cache doesn't invalidate on event creation/update

Cache key `EventList(page, pageSize)` is set with 5min TTL but `InvalidateEventCacheAsync` only clears the slug-based cache. New or updated events won't appear in list for up to 5 minutes. Consider invalidating list cache too, or using shorter TTL.

---

## Low Priority

- L1. `using TicketStar.Infrastructure.Data` imported in `EventService.cs` and `OrderService.cs` — Application layer referencing Infrastructure (for `CacheKeys` and `AppDbContext`). Move `CacheKeys` to Application layer.
- L2. No pagination on `GetMyTickets`, `GetMyOrders`, `GetEventCheckIns`, `GetEventStaff` — will become problematic at scale.
- L3. Transfer ticket doesn't send notification to recipient.
- L4. Missing `[AllowAnonymous]` consideration — `GetEvent` by ID requires auth but `GetEventBySlug` is anonymous. Inconsistent public access pattern.

---

## Positive Observations

- Consistent use of Result<T> pattern across all services
- Distributed lock for ticket quota prevents overselling
- QR code regeneration on ticket transfer (security-aware)
- OrderExpiryService properly releases reserved tickets
- Cache fail-open strategy with proper try/catch
- CancellationToken threaded through all async paths
- Proper ownership checks on event/order mutations

---

## Recommended Actions (Priority Order)

1. **Fix webhook body consumption bug** (C1) — currently broken
2. **Remove/restrict test webhook endpoint** (C2)
3. **Add auth to GetEventStaff** (C3)
4. **Restrict refund to organizer/admin** (C4)
5. **Add quota validation on update** (H4)
6. **Remove unused paidOrders query** (H6)
7. **Move repo calls out of controllers** (H2, H3)
8. **Cap pageSize** (H5)
9. **Add OrderStatus.Refunded** (M3)
10. **Add event deletion guard** (M5)

---

## Unresolved Questions

- Is self-service refund intentional? If so, should there be a time window or approval flow?
- What is the `10` in TicketTypeResponse — max per order? Should it come from config or entity?
- Should unpublished events with existing orders be allowed? Currently no guard.
- Is `StaffAssignment` role-based (e.g., scanner vs. manager) or flat? Current schema suggests flat.
