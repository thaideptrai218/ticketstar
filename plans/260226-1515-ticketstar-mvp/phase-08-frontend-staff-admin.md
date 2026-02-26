# Phase 8 — Frontend Staff & Admin Pages

## Context Links
- [Plan Overview](plan.md) | [Phase 4](phase-04-frontend-auth-and-layout.md)

## Overview
- **Priority:** P2 | **Status:** pending | **Effort:** 6h
- **Depends on:** Phase 3, 4
- Staff check-in portal (QR scanner + manual entry), Admin user management

## Related Code Files
**Create:**
- `frontend/src/app/(staff)/checkin/page.tsx` — select event
- `frontend/src/app/(staff)/checkin/[eventId]/page.tsx` — scanner UI
- `frontend/src/app/(admin)/dashboard/page.tsx` — admin overview
- `frontend/src/app/(admin)/users/page.tsx` — user management
- `frontend/src/components/checkin/qr-scanner.tsx` — camera scanner
- `frontend/src/components/checkin/manual-code-entry.tsx` — fallback text input
- `frontend/src/components/checkin/checkin-result.tsx` — success/error/duplicate display
- `frontend/src/components/admin/users-table.tsx` — user list with actions
- `frontend/src/hooks/use-qr-scanner.ts` — @zxing/browser wrapper

## Implementation Steps

### 1. QR Scanner Hook
1. `useQRScanner(onResult)` — per research report pattern
2. Uses `BrowserMultiFormatReader` from `@zxing/browser`
3. Continuous scanning, calls `onResult(text)` on decode
4. Cleanup on unmount (`.reset()`)
5. Handle camera permission errors gracefully

### 2. Check-in Portal — Event Selection
1. Fetch staff's assigned events: `GET /api/events/my-staff-events` (or filter from events API)
2. Display as card list, click → navigate to scanner

### 3. Check-in Portal — Scanner Page
1. Client Component (camera access required)
2. Two modes: QR Scanner (default) + Manual Code Entry (fallback)
3. **QR Scanner:** video element + `useQRScanner` hook
4. **Manual Entry:** text input for QR data string
5. On scan/submit: `POST /api/checkin/scan` with `{ qrData, eventId }`
6. **CheckinResult component:**
   - Success: green check, attendee name, ticket type, event name
   - Already checked in: orange warning, "Duplicate scan" message, original scan time
   - Invalid: red error, "Invalid ticket" message
7. Auto-reset after 3s for next scan
8. Show running stats: `GET /api/checkin/{eventId}/stats`

### 4. Admin Dashboard
1. Simple overview: total users, total events, total orders (fetch from admin API)

### 5. Admin User Management
1. `UsersTable`: paginated table with columns: name, email, roles, status (active/locked), actions
2. Lock/Unlock toggle button per user → `POST /api/admin/users/{id}/lock|unlock`
3. Search users by email/name
4. No user creation — users self-register via OAuth/Magic Link

## Todo List
- [ ] Create useQRScanner hook
- [ ] Create check-in event selection page
- [ ] Create check-in scanner page (camera + manual)
- [ ] Create CheckinResult component (success/duplicate/error states)
- [ ] Create admin dashboard
- [ ] Create admin users table with lock/unlock
- [ ] Handle camera permission errors
- [ ] Test on mobile browser (Chrome/Safari)

## Success Criteria
- Staff can select assigned event and scan QR codes
- Successful scan shows attendee info
- Duplicate scan shows warning with original scan time
- Manual code entry works as fallback
- Admin can view users and lock/unlock accounts
- Scanner works on mobile Chrome + Safari

## Risk Assessment
- **Camera API browser support:** @zxing/browser handles most modern browsers; test Safari specifically
- **Camera permission denied:** show clear instructions to enable
- **Low light scanning:** QR ECCLevel.M from backend provides good error correction

## Security Considerations
- Staff can only scan events they're assigned to (backend validates)
- Admin endpoints restricted to Admin role
- QR HMAC prevents forged tickets

## Next Steps
- Phase 9: Testing
