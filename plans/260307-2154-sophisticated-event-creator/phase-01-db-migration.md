# Phase 01: DB Migration & Entity Updates

## Context Links
- Brainstorm: `plans/reports/brainstorm-260307-2154-sophisticated-event-creator.md`
- Event entity: `backend/src/TicketStar.Domain/Entities/Event.cs`
- TicketType entity: `backend/src/TicketStar.Domain/Entities/TicketType.cs`
- EF config: `backend/src/TicketStar.Infrastructure/Data/Configurations/`

## Overview

**Priority:** P1 — blocks all other phases
**Status:** Pending
**Effort:** 2h

Add 6 new fields to `Event` and 2 new fields to `TicketType`. Run EF Core migration. This fixes an existing bug where `CreateTicketTypeRequest` accepts `Description`/`MaxPerUser` but the entity has no columns for them.

## Key Insights

- `TicketType` entity is MISSING `Description` and `MaxPerUser` despite DTOs already referencing them — this is a pre-existing mismatch
- `SaleStartAt`/`SaleEndAt` exist on entity but are not exposed in DTOs (fix in Phase 2)
- All new Event fields are nullable (optional in wizard)
- `MaxTicketsPerOrder` on Event is an `int?` — null means no limit

## Requirements

New fields on `Event`:
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `BannerImageUrl` | `string?` | null | 1280x720 background |
| `IsOnline` | `bool` | `false` | offline/online toggle |
| `MaxTicketsPerOrder` | `int?` | null | null = unlimited |
| `RefundPolicy` | `string?` | null | plain text |
| `ContentWarning` | `string?` | null | plain text |
| `PaymentTerms` | `string?` | null | shown at checkout |

New fields on `TicketType`:
| Field | Type | Notes |
|-------|------|-------|
| `Description` | `string?` | perks/benefits |
| `MaxPerUser` | `int` | default 10, min 1 |

## Related Code Files

**Modify:**
- `backend/src/TicketStar.Domain/Entities/Event.cs`
- `backend/src/TicketStar.Domain/Entities/TicketType.cs`
- `backend/src/TicketStar.Infrastructure/Data/Configurations/EventConfiguration.cs` (if exists)
- `backend/src/TicketStar.Infrastructure/Data/Configurations/TicketTypeConfiguration.cs` (if exists)

**Create:**
- `backend/src/TicketStar.Infrastructure/Migrations/{timestamp}_AddEventWizardFields.cs` (auto-generated)

## Implementation Steps

1. **Update `Event.cs`** — add 6 new nullable properties after `ImageUrl`:
   ```csharp
   public string? BannerImageUrl { get; set; }
   public bool IsOnline { get; set; }
   public int? MaxTicketsPerOrder { get; set; }
   public string? RefundPolicy { get; set; }
   public string? ContentWarning { get; set; }
   public string? PaymentTerms { get; set; }
   ```

2. **Update `TicketType.cs`** — add 2 new properties:
   ```csharp
   public string? Description { get; set; }
   public int MaxPerUser { get; set; } = 10;
   ```

3. **Check EF configurations** — if `EventConfiguration.cs` or `TicketTypeConfiguration.cs` exists, add column configs for large text fields (RefundPolicy, ContentWarning, PaymentTerms should use `TEXT` type):
   ```csharp
   builder.Property(e => e.RefundPolicy).HasColumnType("text");
   builder.Property(e => e.ContentWarning).HasColumnType("text");
   builder.Property(e => e.PaymentTerms).HasColumnType("text");
   builder.Property(e => e.BannerImageUrl).HasMaxLength(500);
   ```

4. **Check TicketType config** — add:
   ```csharp
   builder.Property(t => t.Description).HasColumnType("text");
   builder.Property(t => t.MaxPerUser).HasDefaultValue(10);
   ```

5. **Run migration**:
   ```bash
   just migration AddEventWizardFields
   ```

6. **Verify migration file** was generated in `Migrations/` — check UP/DOWN methods look correct

7. **Apply migration**:
   ```bash
   just migrate
   ```

8. **Verify** — check DB or run `just build` to confirm no compile errors

## Todo List

- [ ] Add 6 new fields to `Event.cs`
- [ ] Add 2 new fields to `TicketType.cs`
- [ ] Update EF configurations for column types
- [ ] Run `just migration AddEventWizardFields`
- [ ] Inspect generated migration file
- [ ] Run `just migrate` to apply
- [ ] Run `just build` to verify compile

## Success Criteria

- `just build` passes with no errors
- Migration applied cleanly (no SQL errors)
- DB schema has new columns in `Events` and `TicketTypes` tables

## Risk Assessment

- **Existing data**: New columns are nullable or have defaults — no data loss risk
- **Migration conflict**: Check for any pending migrations before running (`Migrations/` snapshot)
- **MaxPerUser default**: Setting default=10 avoids breaking existing TicketType rows

## Security Considerations

- No auth changes
- Text fields with `HasColumnType("text")` prevent oversized inputs at DB level; validate max length in DTOs (Phase 2)

## Next Steps

→ Phase 02: Backend API updates
