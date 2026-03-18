# Brainstorm: Sophisticated Event Creator (TicketBox-style)

Date: 2026-03-07 | Branch: main

## Problem Statement

Current event form is a basic single-page form: title, slug, description (textarea), venue (text), imageUrl (URL string), start/end dates. No image upload, no ticket management, no settings/payment step. Needs to match TicketBox's multi-step creation flow.

## Requirements

### UI Pattern
- 4-step wizard with progress bar (top navigation like TicketBox screenshot)
- Steps: ① Event Info → ② Time & Tickets → ③ Settings → ④ Payment
- Save/Draft buttons on each step; state held locally, single POST on final submit
- Same wizard reused for Create AND Edit (replaces current basic edit form)

### Step 1: Event Info
- **Images**: Two upload zones (file upload, not URL)
  - Cover photo: 720x958
  - Banner/background: 1280x720
  - Stored at `wwwroot/uploads/` on .NET API, served as static files
- **Event Name** (required)
- **Category** dropdown (existing: Music, Sports, Arts, Technology, Food, Education)
- **Location toggle**: Offline / Online
  - Offline: address text field + city/province dropdown (63 VN provinces via `provinces.open-api.vn` API)
  - Online: platform URL or meeting link field
- **Rich text description** using Tiptap

### Step 2: Time & Tickets
- Event start date/time + end date/time
- Ticket type inline editor
  - Cards list with Add/Edit/Delete per tier
  - Each tier edited via **modal dialog**:
    - Name (required)
    - Price (VND)
    - Quota (total capacity)
    - Sale start date (optional)
    - Sale end date (optional)
    - Description (plain textarea, optional)
  - Supports multiple tiers (General, VIP, etc.)

### Step 3: Settings
- Max tickets per order (integer, optional)
- Refund/cancellation policy (text area)
- Content warning / special requirements (text area)

### Step 4: Payment Terms
- Payment terms / policy text (shown to buyers at checkout)

### Submit Behavior
- Final submit creates event as **Draft** status
- Organizer manually publishes via:
  - Publish button on events list page (per card)
  - Publish button inside event detail/edit wizard page

---

## DB Schema Changes Required

### Event entity — new fields
| Field | Type | Notes |
|-------|------|-------|
| `BannerImageUrl` | string? | 1280x720 banner |
| `IsOnline` | bool | offline/online toggle |
| `MaxTicketsPerOrder` | int? | per-order cap |
| `RefundPolicy` | string? | step 3 |
| `ContentWarning` | string? | step 3 |
| `PaymentTerms` | string? | step 4 |

### TicketType entity — new fields
| Field | Type | Notes |
|-------|------|-------|
| `Description` | string? | perks/benefits text |

### Migration required
One EF Core migration covering all above fields.

---

## Backend Changes

1. **File upload endpoint**: `POST /api/files/upload` (multipart/form-data) → saves to `wwwroot/uploads/`, returns `{ url: "/uploads/filename.ext" }`
2. **Static files middleware**: Serve `wwwroot` in `Program.cs`
3. **Event entity + EF config**: Add 6 new fields
4. **TicketType entity**: Add `Description`
5. **CreateEventRequest / UpdateEventRequest DTOs**: Include all new fields + ticket types array
6. **EventsController**: Update POST/PUT to accept new fields
7. **EventService**: Handle `IsOnline`, `BannerImageUrl`, etc.
8. **PATCH /api/events/{id}/publish**: New endpoint to set Status = Published (organizer only)

---

## Frontend Changes

### New files / replacements
| Path | Action |
|------|--------|
| `components/organizer/event-wizard/` | New — wizard container + step components |
| `components/organizer/event-wizard/wizard-stepper.tsx` | Step progress bar |
| `components/organizer/event-wizard/step-1-event-info.tsx` | Images, title, category, location, description |
| `components/organizer/event-wizard/step-2-time-tickets.tsx` | Dates + ticket type cards |
| `components/organizer/event-wizard/step-3-settings.tsx` | Settings fields |
| `components/organizer/event-wizard/step-4-payment.tsx` | Payment terms |
| `components/organizer/event-wizard/ticket-type-modal.tsx` | Add/edit ticket type dialog |
| `components/organizer/event-wizard/image-upload-zone.tsx` | Drag-drop file upload widget |
| `app/(organizer)/organizer/events/new/page.tsx` | Replace with wizard |
| `app/(organizer)/organizer/events/[id]/edit/page.tsx` | Replace with wizard (pre-populated) |
| `app/(organizer)/organizer/events/page.tsx` | Add Publish button to draft event cards |
| `lib/vn-provinces.ts` | VN provinces fetcher/cache |

### Libraries to add
- `@tiptap/react` + `@tiptap/starter-kit` — rich text editor
- `react-dropzone` — drag-drop image upload

---

## Architecture Decision: Local State → Single Submit

All wizard steps accumulate form state in a single parent component (React state / react-hook-form). No API calls during navigation. On final step submit → single `POST /api/events` (create) or `PUT /api/events/{id}` (edit) with full payload including ticket types array.

This keeps backend simple (no partial save endpoints) and matches the user's stated preference.

---

## Risks
- Tiptap SSR: must use `dynamic(() => import(...), { ssr: false })` in Next.js App Router
- Province API availability: add fallback to static list if API fails
- File upload size limits: set 5MB max in ASP.NET Core middleware
- Edit mode with existing ticket types: need to handle add/edit/delete diffs client-side, send full array on PUT

---

## Out of Scope (YAGNI)
- Age restriction / min age field
- Google Maps autocomplete
- Auto-save on step navigation
- Admin approval workflow
- Rich text for ticket descriptions
