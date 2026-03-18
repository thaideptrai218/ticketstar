# Phase 03: Frontend Wizard Components

## Context Links
- Brainstorm: `plans/reports/brainstorm-260307-2154-sophisticated-event-creator.md`
- Existing form: `frontend/src/components/organizer/event-form.tsx`
- Frontend types: `frontend/src/types/` (check for events types)
- API client: `frontend/src/lib/api-client.ts`

## Overview

**Priority:** P1
**Status:** Completed
**Effort:** 7h
**Completed:** 2026-03-08
**Blocked by:** Phase 01

Build all wizard component files. Keep each file under 200 LOC per code standards.

## Key Insights

- Tiptap must be loaded with `dynamic(() => import(...), { ssr: false })` — App Router SSR incompatible
- `provinces.open-api.vn` fetch; add static fallback array of 63 provinces for resilience
- Wizard holds ALL state locally (no partial API saves); single submit at end
- **Existing `ticket-type-form.tsx`** has a working Dialog form with name/description/price/quota/maxPerUser — adapt & extend for wizard (add SaleStartAt/SaleEndAt)
- Image upload: direct to backend `${NEXT_PUBLIC_API_URL}/api/files/upload` (NO proxy needed — frontend calls backend directly)
- **NO API proxy exists** — `src/proxy.ts` is auth/RBAC middleware only
- `react-dropzone` for drag-drop; also allow click-to-select
- SaleStartAt/SaleEndAt are optional per ticket type — show as collapsible "Advanced" section
- **`formatPrice()` already exists** in `frontend/src/lib/format-utils.ts` — reuse for VND formatting
- **`next.config.ts`** must add backend host to `remotePatterns` for uploaded image display (currently only `images.unsplash.com`)
- TanStack Query (`@tanstack/react-query`) available but organizer pages use `useState`/`useEffect` — keep consistent

## Packages to Install

```bash
cd frontend
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder react-dropzone
```

## Module Structure

```
frontend/src/components/organizer/event-wizard/
├── event-wizard.tsx              # Main wizard container (state, step routing)
├── wizard-stepper.tsx            # Step progress bar (4 steps)
├── step-1-event-info.tsx         # Images, title, category, location, description
├── step-2-time-tickets.tsx       # Dates + ticket type cards list
├── step-3-settings.tsx           # Max per order, refund policy, content warning
├── step-4-payment.tsx            # Payment terms textarea
├── ticket-type-modal.tsx         # Add/edit ticket tier dialog (extend existing ticket-type-form.tsx pattern)
├── image-upload-zone.tsx         # Drag-drop file upload with preview (direct backend upload)
└── rich-text-editor.tsx          # Tiptap wrapper (dynamically imported)
```

## Related Code Files

**Create:**
- `frontend/src/components/organizer/event-wizard/event-wizard.tsx`
- `frontend/src/components/organizer/event-wizard/wizard-stepper.tsx`
- `frontend/src/components/organizer/event-wizard/step-1-event-info.tsx`
- `frontend/src/components/organizer/event-wizard/step-2-time-tickets.tsx`
- `frontend/src/components/organizer/event-wizard/step-3-settings.tsx`
- `frontend/src/components/organizer/event-wizard/step-4-payment.tsx`
- `frontend/src/components/organizer/event-wizard/ticket-type-modal.tsx`
- `frontend/src/components/organizer/event-wizard/image-upload-zone.tsx`
- `frontend/src/components/organizer/event-wizard/rich-text-editor.tsx`
- `frontend/src/lib/vn-provinces.ts`

**Modify:**
- `frontend/src/types/events.ts` — add new fields to `EventDetail` and `TicketType`
- `frontend/src/types/organizer.ts` — add `category`, `bannerImageUrl`, `isOnline` to `OrganizerEvent`
- `frontend/next.config.ts` — add backend host to `images.remotePatterns`

## Data Shape

### WizardState (top-level state in event-wizard.tsx)
```typescript
interface WizardState {
  // Step 1
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  title: string;
  slug: string;          // create mode only (auto-generated from title)
  category: string;
  isOnline: boolean;
  venue: string;
  city: string;
  onlineUrl: string;
  description: string;   // HTML from Tiptap
  // Step 2
  startAt: string;
  endAt: string;
  ticketTypes: TicketTypeFormItem[];
  // Step 3
  maxTicketsPerOrder: number | null;
  refundPolicy: string;
  contentWarning: string;
  // Step 4
  paymentTerms: string;
}

interface TicketTypeFormItem {
  id: string;            // temp client ID (crypto.randomUUID())
  serverId?: string;     // set in edit mode
  name: string;
  description: string;
  price: number;
  quota: number;
  maxPerUser: number;
  saleStartAt: string;
  saleEndAt: string;
}
```

## Implementation Steps

### 1. Install packages
```bash
cd frontend && npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder react-dropzone
```

### 2. Create `lib/vn-provinces.ts`
```typescript
// Fetch 63 VN provinces from open-api.vn with static fallback
const STATIC_FALLBACK = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  // ... add remaining 58 provinces
];

export async function fetchProvinces(): Promise<string[]> {
  try {
    const res = await fetch("https://provinces.open-api.vn/api/?depth=1");
    if (!res.ok) return STATIC_FALLBACK;
    const data = await res.json();
    return data.map((p: { name: string }) => p.name);
  } catch {
    return STATIC_FALLBACK;
  }
}
```

### 3. Create `rich-text-editor.tsx`
- Tiptap with StarterKit + Placeholder extensions
- Toolbar: Bold, Italic, Heading (H2/H3), BulletList, OrderedList
- Export HTML via `editor.getHTML()`
- Dynamic import wrapper — export a `RichTextEditor` component that uses `dynamic(() => ..., { ssr: false })`

### 4. Create `image-upload-zone.tsx`
- Uses `react-dropzone` for drag-drop
- On drop: POST directly to backend `${process.env.NEXT_PUBLIC_API_URL}/api/files/upload`
- **Cannot use `apiFetch`** for file upload — it auto-adds `Content-Type: application/json`. Use raw `fetch` with `FormData` + `credentials: "include"` for auth cookies
- Shows image preview after upload (URL from API response)
- Props: `label`, `dimensions` (e.g. "720x958"), `value: string|null`, `onChange: (url: string) => void`
- Returned URL is relative (`/uploads/...`) — prepend `NEXT_PUBLIC_API_URL` for display

### 5. Create `wizard-stepper.tsx`
- Props: `currentStep: 1|2|3|4`, `onStepClick?: (step: number) => void` (allow back-navigation)
- Steps: "Thông tin sự kiện" | "Thời gian & Loại vé" | "Cài đặt" | "Thông tin thanh toán"
- Active step highlighted; completed steps clickable
- Progress bar fills proportionally

### 6. Create `ticket-type-modal.tsx`
- **Extend pattern from existing `components/organizer/ticket-type-form.tsx`** — already has Dialog + react-hook-form + zod with name/description/price/quota/maxPerUser fields
- Add new fields: SaleStartAt, SaleEndAt (in collapsible "Advanced options" section)
- Change callback: `onSave: (item: TicketTypeFormItem) => void` (local state, not API call)
- Validates: name required, price >= 0, quota >= 1, maxPerUser >= 1
- Props: `open`, `onClose`, `initialData?: TicketTypeFormItem`, `onSave: (item: TicketTypeFormItem) => void`
- Uses `react-hook-form` + `zod` (matching existing pattern)

### 7. Create `step-1-event-info.tsx`
- Two `ImageUploadZone` components (cover + banner)
- Title input (required) + auto-slug generation (kebab-case from title, only in create mode)
- Category select: Music | Sports | Arts | Technology | Food | Education | Other
- Location toggle: Offline / Online
  - Offline: address text + city select (fetched via `fetchProvinces()`)
  - Online: URL/link input
- `RichTextEditor` for description (dynamically imported)
- Props: `data: WizardState`, `onChange: (partial: Partial<WizardState>) => void`, `onNext: () => void`

### 8. Create `step-2-time-tickets.tsx`
- Start/end datetime pickers
- Ticket type cards list
  - Each card: name, price (formatted VND), quota, sale period if set
  - Edit/Delete buttons per card
- "Add ticket type" button → opens `TicketTypeModal`
- Validation: must have at least 1 ticket type to proceed
- Props: same pattern as Step 1

### 9. Create `step-3-settings.tsx`
- Max tickets per order: number input (optional, null = unlimited)
- Refund policy: textarea
- Content warning: textarea
- All fields optional

### 10. Create `step-4-payment.tsx`
- Payment terms: textarea (shown to buyers at checkout)
- Submit button: "Tạo sự kiện" (create) or "Lưu thay đổi" (edit)
- Shows summary of key event details before submit

### 11. Create `event-wizard.tsx` (main container)
- Manages `currentStep` (1-4) and `wizardState`
- Receives `mode: "create" | "edit"` and optional `initialData: EventDetail`
- In edit mode: pre-populate `wizardState` from `initialData`
- On final submit: assemble payload, call `apiFetch`
- Renders `WizardStepper` + current step component
- Shows loading/error state

## VND Currency Formatting — ALREADY EXISTS

Use `formatPrice()` from `frontend/src/lib/format-utils.ts`:
```typescript
import { formatPrice } from "@/lib/format-utils";
// formatPrice(150000) → "150.000đ"
```

**Do NOT create a new `formatVND` function.**

## Image Display — next.config.ts Update

Add backend host to `remotePatterns` in `frontend/next.config.ts` so `<Image>` works with uploaded images:
```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "images.unsplash.com" },
    // Add for uploaded images served from backend:
    { protocol: "http", hostname: "localhost", port: "5010" },
  ],
},
```

## File Upload — Direct Backend Call

Frontend calls backend directly via `NEXT_PUBLIC_API_URL`. No proxy route needed.
Upload URL: `${process.env.NEXT_PUBLIC_API_URL}/api/files/upload`
Use raw `fetch` with `FormData` (not `apiFetch` which forces JSON content-type).

## Todo List

- [x] Install packages: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder, react-dropzone
- [x] Create `lib/vn-provinces.ts` with API fetch + static fallback
- [x] Create `rich-text-editor.tsx` (Tiptap with dynamic import)
- [x] Create `image-upload-zone.tsx` (drag-drop + upload + preview)
- [x] Create `wizard-stepper.tsx` (progress bar)
- [x] Create `ticket-type-modal.tsx` (shadcn Dialog + form)
- [x] Create `step-1-event-info.tsx`
- [x] Create `step-2-time-tickets.tsx`
- [x] Create `step-3-settings.tsx`
- [x] Create `step-4-payment.tsx`
- [x] Create `event-wizard.tsx` (main container)
- [x] Update `types/events.ts` — add new fields to `EventDetail` and `TicketType`
- [x] Update `types/organizer.ts` — add `category`, `bannerImageUrl`, `isOnline` to `OrganizerEvent`
- [x] Update `next.config.ts` — add backend host to `remotePatterns` for image display
- [x] Run `just lint` to check for TS errors

## Success Criteria

- All wizard components render without errors
- Image upload works (file → backend → preview shown)
- Tiptap editor renders (no SSR error)
- Ticket type modal opens, saves, updates card list
- Province dropdown populates (or fallback works)
- `just lint` passes

## Risk Assessment

- **Tiptap SSR**: Must use `dynamic(..., { ssr: false })` — failing to do this causes hydration errors
- **Province API down**: Static fallback required; fetch should have try/catch
- **File upload CORS**: Backend must allow frontend origin for multipart uploads; verify CORS config in `appsettings.json`
- **Slug auto-generation**: Must sanitize to `[a-z0-9-]`, truncate at reasonable length

## Security Considerations

- Never display raw HTML from Tiptap without sanitization (but since organizer writes it, acceptable; sanitize on display for attendees)
- File upload size validated both client-side (dropzone) and server-side (Phase 2)

## Next Steps

→ Phase 04: Pages & Integration
