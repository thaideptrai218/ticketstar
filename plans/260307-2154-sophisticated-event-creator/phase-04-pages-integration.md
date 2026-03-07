# Phase 04: Pages & Integration

## Context Links
- Brainstorm: `plans/reports/brainstorm-260307-2154-sophisticated-event-creator.md`
- New event page: `frontend/src/app/(organizer)/organizer/events/new/page.tsx`
- Edit event page: `frontend/src/app/(organizer)/organizer/events/[id]/edit/page.tsx`
- Events list page: `frontend/src/app/(organizer)/organizer/events/page.tsx`
- Old form (to remove): `frontend/src/components/organizer/event-form.tsx`

## Overview

**Priority:** P1
**Status:** Pending
**Effort:** 3h
**Blocked by:** Phase 02 + Phase 03

Wire wizard into existing pages, replace old form, verify end-to-end flow.

## Key Insights

- Events list page (`events/page.tsx`) already has publish/unpublish toggle — verify it still works after backend changes
- Old `event-form.tsx` becomes unused after page replacements — delete it
- Edit page needs to fetch event data first, then pass as `initialData` to wizard
- In edit mode, slug field is hidden (same as old form with `hideSlug` prop)
- New event is created as Draft status — confirm success message reflects this

## Related Code Files

**Modify:**
- `frontend/src/app/(organizer)/organizer/events/new/page.tsx`
- `frontend/src/app/(organizer)/organizer/events/[id]/edit/page.tsx`
- `frontend/src/app/(organizer)/organizer/events/page.tsx`

**Delete:**
- `frontend/src/components/organizer/event-form.tsx` (replaced by wizard)

## Implementation Steps

### 1. Replace create page (`events/new/page.tsx`)

Replace entire file:
```tsx
"use client";
import { EventWizard } from "@/components/organizer/event-wizard/event-wizard";

export default function CreateEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Tạo sự kiện mới</h1>
      <EventWizard mode="create" />
    </div>
  );
}
```

### 2. Replace edit page (`events/[id]/edit/page.tsx`)

- Fetch event data via `apiFetch<EventDetail>(`/api/events/${id}`)`
- Show skeleton while loading
- Pass `mode="edit"` and `initialData={event}` to `EventWizard`
- Wizard pre-populates all fields from `initialData`

```tsx
"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { EventWizard } from "@/components/organizer/event-wizard/event-wizard";
import { apiFetch } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventDetail } from "@/types/events";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<EventDetail>(`/api/events/${id}`)
      .then(setEvent)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!event) return <p className="text-red-500">Không tìm thấy sự kiện.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Chỉnh sửa: {event.title}</h1>
      <EventWizard mode="edit" initialData={event} />
    </div>
  );
}
```

### 3. Update events list page (`events/page.tsx`)

- Verify publish/unpublish toggle still works (calls `/api/events/${id}/publish` and `/unpublish`)
- Add visual indicator for Draft events: badge + "Publish" button prominently visible
- Ensure new event fields (`bannerImageUrl`, `isOnline`) are handled (don't break existing card rendering)
- If event cards show images: update to use `bannerImageUrl` as fallback when `imageUrl` not available

### 4. Delete old form

Delete `frontend/src/components/organizer/event-form.tsx` — it is now fully replaced by the wizard.
Verify no other files import from it:
```bash
grep -r "event-form" frontend/src --include="*.tsx" --include="*.ts"
```
If other imports exist, update them.

### 5. Update frontend EventDetail type

Ensure `frontend/src/types/events.ts` (or wherever `EventDetail` / `OrganizerEvent` are defined) includes all new fields:
```typescript
// Add to EventDetail:
bannerImageUrl?: string | null;
isOnline: boolean;
maxTicketsPerOrder?: number | null;
refundPolicy?: string | null;
contentWarning?: string | null;
paymentTerms?: string | null;

// Add to TicketTypeResponse:
saleStartAt?: string | null;
saleEndAt?: string | null;
```

### 6. End-to-end test (manual)

**Create flow:**
1. Go to `/organizer/events/new`
2. Step 1: Upload cover + banner images → verify preview shown
3. Fill title → verify slug auto-generated
4. Select category, toggle Online, add platform URL
5. Write description in Tiptap editor
6. Click Next → Step 2
7. Set start/end dates
8. Add 2 ticket types via modal (one free, one paid with sale dates)
9. Click Next → Step 3
10. Set max tickets per order = 5, add refund policy text
11. Click Next → Step 4
12. Add payment terms, click "Tạo sự kiện"
13. Verify redirect to events list, event shows as Draft
14. Click Publish → verify status changes to Published

**Edit flow:**
1. Click Edit on existing event
2. Verify all fields pre-populated
3. Change title, update description
4. Save → verify changes persisted

### 7. Run lint + build
```bash
just lint
just build
```

Fix any TypeScript errors.

## Todo List

- [ ] Replace `events/new/page.tsx` with wizard
- [ ] Replace `events/[id]/edit/page.tsx` with wizard + prefetch
- [ ] Update `events/page.tsx` — verify publish toggle works with new backend
- [ ] Delete `event-form.tsx` — verify no remaining imports
- [ ] Update `EventDetail` and `OrganizerEvent` TypeScript types with new fields
- [ ] Manual end-to-end test: create flow (all 4 steps)
- [ ] Manual end-to-end test: edit flow
- [ ] Manual test: publish from events list
- [ ] Run `just lint` and `just build`

## Success Criteria

- Create new event via 4-step wizard, event saved as Draft
- Edit existing event, changes persisted
- Publish draft event from list page
- No TypeScript errors (`just lint`)
- `just build` succeeds
- Images upload and display correctly

## Risk Assessment

- **Type mismatches**: Backend returns new fields but frontend types may be stale — update types before integration
- **Slug generation**: Auto-slug on title change must debounce and prevent duplicates (uniqueness checked server-side, surface error to user)
- **Edit mode ticket types**: Existing ticket types from `initialData` must populate `ticketTypes` array with proper `serverId` — so update correctly on PUT

## Security Considerations

- Edit page: wizard sends PUT to `/api/events/${id}` — backend must verify organizer owns event (existing auth check)
- Slug: sanitize to prevent injection (`/^[a-z0-9-]+$/` validation in zod)

## Next Steps

- After integration: run `just test` to confirm backend tests still pass
- Update `docs/codebase-summary.md` to reflect new organizer event creation flow
