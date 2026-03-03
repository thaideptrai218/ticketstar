# Health Checks, MassTransit License, Port Cleanup Fixes

**Date:** 2026-03-03 22:45
**Status:** Complete

## Summary

Fixed critical DI conflicts, resolved MassTransit licensing issues, and improved developer experience with port cleanup.

## Changes Made

### 1. Health Check DI Conflict Fix
**Problem:** Duplicate `AddHealthChecks()` calls causing dependency injection conflicts
**Solution:**
- Created health check builder in `Program.cs` before MassTransit
- Modified `MassTransitExtensions.AddMassTransitWithRabbitMQ()` to accept optional `IHealthChecksBuilder` parameter
- RabbitMQ health check now adds to existing builder instead of creating new one

**Files Modified:**
- `/home/thaibeo/Code/ticketstar/backend/src/TicketStar.API/Program.cs` (lines 23-28)
- `/home/thaibeo/Code/ticketstar/backend/src/TicketStar.API/Extensions/MassTransitExtensions.cs` (lines 9-10, 33-40)

### 2. MassTransit License Downgrade
**Problem:** MassTransit 9.x requires commercial license
**Solution:** Downgraded to 8.3.4 (open-source AGPL license)

**Files Modified:**
- `/home/thaibeo/Code/ticketstar/backend/src/TicketStar.API/TicketStar.API.csproj` (line 21)
- `/home/thaibeo/Code/ticketstar/backend/src/TicketStar.Application/TicketStar.Application.csproj` (lines 17-18)
- `/home/thaibeo/Code/ticketstar/.env.example` (line 9: `MT_LICENSE=` now empty)

### 3. Configuration Updates
**Added missing configs to `appsettings.json`:**
- RabbitMQ connection settings (Host, Port, UserName, Password)
- QR code settings (HmacSecret, QrCodeSize, QrExpiryHoursAfterEventStart)
- SePay settings (ApiKey, SecretKey, WebhookPath, UseMock)
- Admin account settings (Email, Password)

**Files Modified:**
- `/home/thaibeo/Code/ticketstar/backend/src/TicketStar.API/appsettings.json`

### 4. Port Cleanup Automation
**Problem:** Port conflicts (3001, 5010) when restarting `just dev`
**Solution:** Added auto-cleanup to `just dev` via `stop-infra` recipe

**Files Modified:**
- `/home/thaibeo/Code/ticketstar/justfile` (lines 16-31)

## Verification

✅ No secrets committed (all use `${VAR}` placeholders or are in `.env.example`)
✅ `.env` file properly gitignored
✅ `appsettings.Development.json` properly gitignored
✅ Health check endpoints: `/health/live` and `/health/ready`
✅ MassTransit 8.3.4 consistent across all projects
✅ Port cleanup integrated into dev workflow

## Unresolved Questions

None

## Next Steps

None - fixes complete and verified.
