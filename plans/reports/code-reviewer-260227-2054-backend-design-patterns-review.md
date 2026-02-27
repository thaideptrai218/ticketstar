# Plan Review: Backend Design Patterns Implementation

**Reviewer:** code-reviewer
**Date:** 2026-02-27
**Plan:** `/home/welterial/projects/ticketstar/plans/260227-2006-backend-design-patterns/plan.md`
**Scope:** 7 phases, 9 patterns, full backend refactor

---

## Rating: 7.5 / 10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 7/10 | Covers core patterns well; missing logging/observability, validation, testing strategy |
| Correctness | 8/10 | Patterns accurately described; minor design issues in Result type and UoW |
| Practicality | 9/10 | Realistic scope, hand-implemented (no unnecessary packages), correct effort estimates |
| Architecture | 7/10 | Good layered approach; deferred dependency inversion is a pragmatic call but leaves tech debt |
| Priority ordering | 8/10 | Sensible sequencing; Phase 2 (Options) could be merged into Phase 6 (DI) to reduce churn |

**Summary:** Solid, well-structured plan targeting the right patterns at the right time. Code samples are production-quality and match the existing codebase style. Main gaps: no testing plan for the refactored code, missing error classification in Result, and several deferred patterns (Correlation IDs, Problem Details) that arguably belong in the "NOW" tier from the project's own `backend-design-patterns.md`.

---

## Critical Issues

### C1. Result type embeds HTTP status codes in Application layer

**File:** `phase-01-common-types.md` (lines 20-46)

The `Result<T>` class includes `StatusCode` (HTTP int) as a property, with services returning values like `Result.Failure("...", 409)` or `Result.Failure("...", 401)`. This leaks HTTP/transport concerns into the Application layer, violating Clean Architecture's dependency rule.

**Impact:** Application services become aware of HTTP semantics. If you ever serve results via gRPC, SignalR, or a background job, the status codes are meaningless.

**Recommendation:** Use an error enum or error type instead:
```csharp
public enum ResultError { NotFound, Conflict, Unauthorized, Forbidden, Validation, Internal }

public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public ResultError? ErrorType { get; }
    // ...
}
```
Then map `ResultError` to HTTP status in `ApiControllerBase.FromResult()`. This keeps the Application layer transport-agnostic.

### C2. No test update plan despite 35 existing tests

**File:** `plan.md` (line 59), `phase-05-refactor-services.md` (lines 102-104)

The plan acknowledges "35 tests need update" and "interface signatures change" but has no dedicated testing phase or test update steps. Phase 5 has a single TODO item "Run existing tests" -- this is insufficient. The refactor changes return types (`Task<T>` to `Task<Result<T>>`), constructor signatures (DbContext to repositories), and exception flow (throw to Result). Every service test that touches AuthService/TokenService will break.

**Recommendation:** Add explicit test update steps in Phase 5:
- Update test mocks for repository interfaces
- Update assertions for Result<T> returns instead of exception catches
- Add negative-case tests for Result.Failure paths
- Verify test count does not decrease post-refactor

---

## High Priority

### H1. Correlation IDs and Problem Details deferred but should be in this plan

**File:** `plan.md` (line 27)

The project's own `backend-design-patterns.md` (lines 9-19) places Correlation IDs (#15) and Problem Details (#8) in the "NOW" tier. The plan defers both. Correlation IDs are trivial to add (one middleware) and are essential for debugging production issues. Problem Details is a standard error format that complements the ApiResponse envelope.

**Recommendation:** Add Correlation ID middleware to Phase 3 (it is ~30 lines, documented in `backend-design-patterns.md`). Problem Details can remain deferred if ApiResponse is the chosen format, but document the decision explicitly.

### H2. ApiResponse lives in Application layer but is a presentation concern

**File:** `phase-01-common-types.md` (lines 48-79)

`ApiResponse<T>` is a response envelope -- it includes `TraceId` (HTTP-specific), `Success` boolean, and is designed for JSON API serialization. It belongs in the API layer, not Application.

**Recommendation:** Move `ApiResponse.cs` to `TicketStar.API/Models/` or `TicketStar.API/Common/`. Keep `Result.cs` and pagination types in Application since they represent domain-agnostic operation outcomes.

### H3. UoW interface design inconsistent with the design patterns doc

**File:** `phase-04-repository-uow.md` (lines 47-58) vs `backend-design-patterns.md` (lines 573-580)

The plan's `IUnitOfWork` has transaction methods (`BeginTransactionAsync`, `CommitTransactionAsync`, `RollbackTransactionAsync`) but no repository properties. The design patterns doc shows `IUnitOfWork` with `Users`, `Events`, `Orders` properties. These are two different patterns.

The plan's approach (separate repository injection + IUnitOfWork for save/transactions) is actually the better pattern for DI, but it should be documented that this is a deliberate deviation from the doc's reference design.

### H4. PaginatedResponse division by zero

**File:** `phase-01-common-types.md` (line 116)

```csharp
public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
```

If `PageSize` is 0, this produces `Infinity` cast to `int`, which is `int.MinValue` on some runtimes or throws `OverflowException`. While `ClampedPageSize` clamps to minimum 1 in the request, `PaginatedResponse` uses the raw `PageSize` property.

**Recommendation:** Use `Math.Max(PageSize, 1)` in the `TotalPages` calculation, or make the response always use the clamped value.

---

## Medium Priority

### M1. Missing IAuthSessionRepository interface

**File:** `phase-04-repository-uow.md` (line 128)

The implementation list mentions `AuthSessionRepository.cs` but there is no corresponding `IAuthSessionRepository` interface defined in the Domain Interfaces section. The `SessionService` currently uses `AppDbContext` directly with `FindAsync` and query operations that need a proper interface.

**Recommendation:** Add `IAuthSessionRepository` interface alongside the others.

### M2. Dependency inversion deferred indefinitely

**File:** `phase-04-repository-uow.md` (lines 131-135)

The plan explicitly notes "Application.csproj currently references Infrastructure.csproj. Ideally Application only references Domain." and defers the cleanup. This means even after this plan, the project still has improper layer references. Services will inject repository interfaces but the csproj still allows direct DbContext access.

**Recommendation:** Since the plan already creates all repository interfaces and implementations, the project reference change is a 2-line csproj edit. Add it as a step in Phase 4 or Phase 6:
- Remove `Infrastructure` reference from `Application.csproj`
- Add `Application` reference to `Infrastructure.csproj` (if needed for DI)
- Verify build

### M3. Generic repository exposes IQueryable -- abstraction leak

**File:** `phase-04-repository-uow.md` (lines 42-43)

```csharp
IQueryable<T> Query();
IQueryable<T> QueryIgnoreFilters();
```

Returning `IQueryable<T>` from a repository defeats the purpose of the abstraction. Callers can compose arbitrary LINQ on top, which couples them to EF Core's LINQ provider capabilities. Cannot swap to Dapper without rewriting every call site.

**Recommendation:** Either:
- Accept this as a pragmatic compromise and document it (honest)
- Use specification pattern for complex queries
- Add specific query methods to entity repositories (already done for `GetByEmailAsync` etc.)

If keeping `IQueryable`, consider naming the methods `AsQueryable()` with a XML doc comment noting the EF Core dependency.

### M4. Google login exception still unhandled by Result pattern

**File:** `phase-05-refactor-services.md` (lines 49-63)

The plan updates AuthService to return `Result<T>` for business failures, but `GoogleLoginAsync` also calls `GoogleJsonWebSignature.ValidateAsync(idToken)` which throws `InvalidJwtException` on invalid/expired Google tokens. The plan doesn't mention wrapping this external call.

**Recommendation:** Wrap Google API call in try-catch within the service and convert `InvalidJwtException` to `Result.Failure("Invalid Google token.", 401)`.

### M5. Phase numbering gap in plan.md scope table

**File:** `plan.md` (lines 15-26)

Scope table jumps from #5 to #7 (skipping #6), then #9 (skipping #8), then #10 (skipping #11), then #12 (skipping #13-20). This is inherited from `backend-design-patterns.md` numbering but confusing without explanation in the plan itself.

### M6. Register endpoint should return 201 but CreatedFromResult requires actionName

**File:** `phase-03-middleware-and-base.md` (lines 79-85)

`CreatedFromResult<T>(result, actionName, routeValues)` requires an action name for the `Location` header. For `Register`, what action should it point to? There is no `GetUser` endpoint planned. Using `nameof(Register)` would create a self-referencing Location header, which is incorrect per REST semantics.

**Recommendation:** Either:
- Use `CreatedAtAction(null, null, ...)` with just the body (acceptable for auth)
- Add a simple `Created()` variant to `ApiControllerBase` that returns 201 without Location header

---

## Low Priority

### L1. No `CancellationToken` propagation in existing service methods

The plan's repository interfaces correctly include `CancellationToken ct = default` parameters. However, the refactored service method signatures in Phase 5 do not show adding `CancellationToken` parameters. This is a good time to add them since signatures are already changing.

### L2. `ApiResponse` and `ApiResponse<T>` have inconsistent property naming

`ApiResponse` has `Message` + `Error`, while `ApiResponse<T>` has `Data` + `Error`. When success, one returns `message`, the other `data`. Frontend must handle both shapes.

### L3. No `IDisposable` on `IUnitOfWork` discussion

Phase 4 defines `IUnitOfWork : IDisposable` with explicit transaction methods. Services using `IUnitOfWork` must be careful about disposal ownership. Since `EfUnitOfWork` wraps `AppDbContext` which is scoped, the DI container handles disposal. The `IDisposable` on the interface may mislead developers into wrapping it in `using` blocks.

---

## Missing Implementations (Should Add)

| Pattern | Priority | Rationale |
|---------|----------|-----------|
| **Structured logging/Serilog** | High | Current `ILogger` uses default console; production needs structured JSON, log levels, sinks |
| **Correlation ID middleware** | High | Already documented in project's own patterns doc as "NOW" tier |
| **Input validation** | High | No validation on DTOs (RegisterRequest, LoginRequest) beyond what EF enforces; DataAnnotations minimum |
| **Test update strategy** | High | 35 tests will break; no plan to fix them |
| **CancellationToken propagation** | Medium | Controllers should pass `HttpContext.RequestAborted` through services |
| **Request/response logging middleware** | Medium | No observability into API traffic |
| **CORS configuration parameterization** | Low | Hardcoded `localhost:3001`; should use Options pattern too |

## Nice-to-Haves

| Pattern | Benefit |
|---------|---------|
| **FluentValidation (deferred #11)** | Complex password rules, cross-field validation; currently zero input validation |
| **Response compression** | Gzip/Brotli for JSON responses |
| **ETag/conditional requests** | Cache efficiency for GET endpoints |
| **API documentation (XML comments)** | Swagger picks up XML docs automatically |
| **Specification pattern** | Replace `IQueryable` exposure with composable query objects |
| **Mapper abstraction** | Entity-to-DTO mapping is implicit; Mapster/AutoMapper or manual mappers keep it consistent |

---

## Concerns / Red Flags

### RF1. Plan contradicts roadmap phase ordering

The development roadmap (`docs/development-roadmap.md`) shows Phase 3 as "Backend API" (events, tickets, orders, check-in). This design patterns plan is infrastructure refactoring that should logically happen BEFORE Phase 3 starts (to avoid building new features on the old patterns). However, the roadmap does not reference this plan. Ensure the roadmap is updated to acknowledge this patterns refactor sits between Phase 2 and Phase 3.

### RF2. No rollback strategy

This is a large refactor touching every service, controller, and interface. No mention of:
- Feature branch strategy
- Incremental migration (can intermediate phases be deployed independently?)
- What happens if Phase 5 (the big refactor) fails partway through?

**Recommendation:** Add a note that all phases should be on a single feature branch and merged together, since Phases 1-4 are additive but Phase 5 modifies existing code that depends on the new additions.

### RF3. Single NuGet package minimalism is good but...

The plan prides itself on "No other new packages needed -- all patterns are hand-implemented." This is mostly good (YAGNI), but hand-implementing patterns like Result has edge cases. Consider at minimum adding `[DebuggerDisplay]` attributes and `implicit operator` conversions for ergonomics.

---

## Positive Observations

1. **Correct pattern selection** -- The 9 patterns chosen are exactly the right foundation for a production .NET backend at this maturity level. Nothing over-engineered.
2. **Accurate codebase analysis** -- Every "Before/After" code sample matches the actual current code (verified against `AuthService.cs`, `TokenService.cs`, `Program.cs`, `AuthController.cs`).
3. **Phase dependency graph is correct** -- Phase 5 correctly lists all prerequisites (1, 3, 4). Phase 6 correctly depends on 2, 4, 5.
4. **Pagination includes both offset and cursor** -- Supporting both patterns upfront avoids a painful migration later.
5. **Health check design** -- Proper separation of liveness vs readiness probes with tag-based filtering. Container-orchestrator ready.
6. **Options pattern with ValidateOnStart()** -- Fail-fast on misconfiguration is a best practice many teams miss.
7. **Pragmatic UoW** -- Separate repository injection instead of UoW-owns-all-repos is the modern DI-friendly approach.
8. **Minimal new dependencies** -- Only one NuGet package added (health check). Avoids dependency bloat.

---

## Recommended Actions (Priority Order)

1. **[Critical]** Refactor `Result<T>` to use error type enum instead of HTTP status codes
2. **[Critical]** Add explicit test update steps to Phase 5 (or create Phase 5.5)
3. **[High]** Move `ApiResponse.cs` to API layer
4. **[High]** Add Correlation ID middleware to Phase 3
5. **[High]** Add `IAuthSessionRepository` interface to Phase 4
6. **[Medium]** Guard `PaginatedResponse.TotalPages` against division by zero
7. **[Medium]** Add `CancellationToken` to refactored service signatures in Phase 5
8. **[Medium]** Document the `IQueryable` leak as a known trade-off
9. **[Medium]** Add `CreatedResult` overload without Location header for auth endpoints
10. **[Low]** Merge Phase 2 options registration into Phase 6 DI extensions to reduce intermediate states

---

## Unresolved Questions

1. Should `ApiResponse` live in Application or API layer? (Recommendation: API)
2. Should the Application-to-Infrastructure project reference be cleaned up now or deferred?
3. Is `GoogleJsonWebSignature.ValidateAsync` exception handling in scope for this plan?
4. Will this refactor happen on a feature branch, and should the roadmap be updated to reflect it?
5. What is the minimum test coverage expected after Phase 5 refactor?

---

**Report:** `/home/welterial/projects/ticketstar/plans/reports/code-reviewer-260227-2054-backend-design-patterns-review.md`
**Last Updated:** 2026-02-27
