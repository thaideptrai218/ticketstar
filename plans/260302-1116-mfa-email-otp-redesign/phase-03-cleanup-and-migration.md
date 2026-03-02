# Phase 3: Cleanup & Migration

## Overview
- **Priority:** Medium
- **Status:** Pending
- **Effort:** 1h
- **Depends on:** Phase 1
- DB migration to drop MfaSecret column + MfaRecoveryCode table, remove NuGet/npm deps, update docs

## Related Code Files

### Files to Modify
| File | Action | Description |
|------|--------|-------------|
| `backend/src/TicketStar.API/TicketStar.API.csproj` | Modify | Remove QRCoder package ref |
| `backend/src/TicketStar.Application/TicketStar.Application.csproj` | Modify | Remove OtpNet package ref |
| `frontend/package.json` | Modify | Remove react-qr-code |
| `docs/auth/backend-architecture.md` | Modify | Update MFA section |
| `docs/auth/frontend-api-reference.md` | Modify | Update MFA endpoints |
| `docs/system-architecture.md` | Modify | Update MFA references |

## Implementation Steps

### 1. Create EF Core migration
```bash
cd backend/src/TicketStar.API
dotnet ef migrations add RemoveTotp_SwitchToEmailOtp \
  --project ../TicketStar.Infrastructure \
  --context AppDbContext
```
Migration should:
- Drop `MfaSecret` column from `Users` table
- Drop `MfaRecoveryCodes` table
- Reset any users with `MfaEnabled = true` to `false` (no TOTP secret to validate anymore)

### 2. Apply migration
```bash
just migrate
```

### 3. Remove NuGet packages
```bash
cd backend/src/TicketStar.Application && dotnet remove package OtpNet
cd backend/src/TicketStar.API && dotnet remove package QRCoder
```

### 4. Remove npm package
```bash
cd frontend && pnpm remove react-qr-code
```

### 5. Clean up .env.example
Remove `MFA_ENCRYPTION_KEY` variable — no longer needed.

### 6. Update docs
- `docs/auth/backend-architecture.md` — replace TOTP/QR/recovery section with email OTP description
- `docs/auth/frontend-api-reference.md` — update MFA endpoint contracts
- `docs/system-architecture.md` — update MFA references in architecture diagram

### 7. Verify full build
```bash
just build
just test
```

## Todo List
- [ ] Create EF Core migration (drop MfaSecret, MfaRecoveryCodes table)
- [ ] Apply migration
- [ ] Remove OtpNet and QRCoder NuGet packages
- [ ] Remove react-qr-code npm package
- [ ] Remove MFA_ENCRYPTION_KEY from .env.example
- [ ] Update auth docs (backend-architecture, frontend-api-reference)
- [ ] Update system-architecture.md
- [ ] Verify `just build` and `just test` pass

## Success Criteria
- DB schema has no MfaSecret column or MfaRecoveryCodes table
- No OtpNet, QRCoder, react-qr-code in dependency files
- No MFA_ENCRYPTION_KEY in .env.example
- Docs accurately describe email OTP MFA
- Full build + test green
