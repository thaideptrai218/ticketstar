---
phase: 3
title: "Frontend - Wire city in wizard submit and types"
status: pending
effort: 20min
---

# Phase 3: Frontend

## Overview

Include `city` in wizard submit payload and add to TypeScript types. The wizard UI already captures city via a province dropdown in Step1 — it just needs to be sent to the API.

## Files to Modify

- `frontend/src/components/events/event-wizard.tsx` — add city to submit payload
- `frontend/src/types/events.ts` — add city to EventListItem, EventDetail
- `frontend/src/types/organizer.ts` — add city to OrganizerEvent

## Implementation Steps

1. **Update submit payload in event-wizard.tsx**
   - Find the submit/handleSubmit function where the request body is built
   - Add `city: state.city || null` to the payload object
   - Place alongside existing `venue` field

2. **Update types/events.ts**
   - Add `city?: string | null` to `EventListItem` interface
   - Add `city?: string | null` to `EventDetail` interface

3. **Update types/organizer.ts**
   - Add `city?: string | null` to `OrganizerEvent` interface

4. **Verify existing UI**
   - Step1EventInfo already has city dropdown — no changes needed there
   - Confirm city displays correctly in event detail/list views if shown

## Success Criteria

- [ ] City sent in create/update API calls from wizard
- [ ] TypeScript types include city field
- [ ] No type errors after changes
- [ ] Wizard still functions end-to-end with city selected
