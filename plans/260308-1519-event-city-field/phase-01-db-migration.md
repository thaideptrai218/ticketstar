---
phase: 1
title: "DB Migration - Add City column"
status: pending
effort: 30min
---

# Phase 1: DB Migration

## Overview

Add nullable `City` column to `Events` table via EF Core migration.

## Files to Modify

- `backend/src/TicketStar.Domain/Entities/Event.cs` — add property
- `backend/src/TicketStar.Infrastructure/Data/Configurations/EventConfiguration.cs` — add config

## Implementation Steps

1. **Add property to Event entity**
   - Add `public string? City { get; set; }` to `Event.cs`
   - Place near existing `Venue` property for logical grouping

2. **Add EF configuration**
   - In `EventConfiguration.cs`, add:
     ```csharp
     builder.Property(e => e.City).HasMaxLength(200);
     ```
   - Place after the `Venue` config line

3. **Generate and apply migration**
   ```bash
   just migration AddEventCity
   just migrate
   ```

4. **Verify** migration SQL adds nullable `City varchar(200)` column

## Success Criteria

- [ ] `City` property exists on `Event` entity
- [ ] EF config sets max length 200
- [ ] Migration created and applied without errors
- [ ] Existing data unaffected (column is nullable)
