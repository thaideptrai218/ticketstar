# Phase 03: Frontend Wizard Components

## Context Links
- Brainstorm: `plans/reports/brainstorm-260307-2154-sophisticated-event-creator.md`
- Existing form: `frontend/src/components/organizer/event-form.tsx`
- Frontend types: `frontend/src/types/` (check for events types)
- API client: `frontend/src/lib/api-client.ts`

## Overview

**Priority:** P1
**Status:** Pending
**Effort:** 7h
**Blocked by:** Phase 01

Build all wizard component files. Keep each file under 200 LOC per code standards.

## Key Insights

- Tiptap must be loaded with `dynamic(() => import(...), { ssr: false })` — App Router SSR incompatible
- `provinces.open-api.vn` fetch; add static fallback array of 63 provinces for resilience
- Wizard holds ALL state locally (no partial API saves); single submit at end
- Ticket types use modal dialog (shadcn `Dialog`) not inline expand
- Image upload: `POST /api/files/upload` multipart, show preview after success
- `react-dropzone` for drag-drop; also allow click-to-select
- SaleStartAt/SaleEndAt are optional per ticket type — show as collapsible "Advanced" section

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
├── ticket-type-modal.tsx         # Add/edit ticket tier dialog
├── image-upload-zone.tsx         # Drag-drop file upload with preview
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
- `frontend/src/types/events.ts` (or equivalent) — add new fields to EventDetail type

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
- On drop: POST to `/api/proxy/files/upload` (via Next.js proxy) or direct to backend
- Shows image preview after upload (URL from API response)
- Props: `label`, `dimensions` (e.g. "720x958"), `value: string|null`, `onChange: (url: string) => void`
- Upload via `apiFetch` with FormData

**Note on proxy:** Check if `frontend/src/proxy.ts` routes `/api/files/*` to backend. If not, add route.

### 5. Create `wizard-stepper.tsx`
- Props: `currentStep: 1|2|3|4`, `onStepClick?: (step: number) => void` (allow back-navigation)
- Steps: "Thông tin sự kiện" | "Thời gian & Loại vé" | "Cài đặt" | "Thông tin thanh toán"
- Active step highlighted; completed steps clickable
- Progress bar fills proportionally

### 6. Create `ticket-type-modal.tsx`
- shadcn `Dialog` component
- Form fields: Name*, Price*, Quota*, MaxPerUser, Description, SaleStartAt, SaleEndAt
- SaleStartAt/SaleEndAt in collapsible "Advanced options" section
- Validates: name required, price >= 0, quota >= 1, maxPerUser >= 1
- Props: `open`, `onClose`, `initialData?: TicketTypeFormItem`, `onSave: (item: TicketTypeFormItem) => void`
- Uses `react-hook-form` + `zod`

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

## VND Currency Formatting

Use existing `formatDate` utils or add `formatVND`:
```typescript
export const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
```

## Proxy Route for File Upload

Check `frontend/src/proxy.ts`. If `/api/files` not proxied to backend, add:
```typescript
// In proxy routes config
{ path: "/api/files", target: BACKEND_URL }
```

## Todo List

- [ ] Install packages: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder, react-dropzone
- [ ] Create `lib/vn-provinces.ts` with API fetch + static fallback
- [ ] Create `rich-text-editor.tsx` (Tiptap with dynamic import)
- [ ] Create `image-upload-zone.tsx` (drag-drop + upload + preview)
- [ ] Create `wizard-stepper.tsx` (progress bar)
- [ ] Create `ticket-type-modal.tsx` (shadcn Dialog + form)
- [ ] Create `step-1-event-info.tsx`
- [ ] Create `step-2-time-tickets.tsx`
- [ ] Create `step-3-settings.tsx`
- [ ] Create `step-4-payment.tsx`
- [ ] Create `event-wizard.tsx` (main container)
- [ ] Update frontend event types for new fields
- [ ] Verify/add `/api/files` proxy route
- [ ] Run `just lint` to check for TS errors

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
- **File upload proxy**: If `/api/files` not in proxy config, upload will 404
- **Slug auto-generation**: Must sanitize to `[a-z0-9-]`, truncate at reasonable length

## Security Considerations

- Never display raw HTML from Tiptap without sanitization (but since organizer writes it, acceptable; sanitize on display for attendees)
- File upload size validated both client-side (dropzone) and server-side (Phase 2)

## Next Steps

→ Phase 04: Pages & Integration
