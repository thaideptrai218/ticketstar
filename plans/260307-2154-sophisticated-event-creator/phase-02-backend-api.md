# Phase 02: Backend API Updates

## Context Links
- Brainstorm: `plans/reports/brainstorm-260307-2154-sophisticated-event-creator.md`
- DTOs: `backend/src/TicketStar.Application/DTOs/Events/EventDtos.cs`
- Controller: `backend/src/TicketStar.API/Controllers/EventsController.cs`
- Service: `backend/src/TicketStar.Application/Services/EventService.cs`
- Program.cs: `backend/src/TicketStar.API/Program.cs`

## Overview

**Priority:** P1 — blocks Phase 3 integration
**Status:** Pending
**Effort:** 4h
**Blocked by:** Phase 01

Update DTOs, EventService, and EventsController to support all new fields. Add file upload endpoint. Verify publish/unpublish endpoints exist (frontend already calls them).

## Key Insights

- `CreateTicketTypeRequest` already has `Description` and `MaxPerUser` — but entity was missing columns (fixed in Phase 1). No DTO change needed for these.
- `SaleStartAt`/`SaleEndAt` exist on `TicketType` entity but are NOT in `CreateTicketTypeRequest` DTO — must add
- `PublishEventRequest` DTO already exists; verify controller endpoints `/publish` and `/unpublish`
- File upload: `POST /api/files/upload` → multipart, save to `wwwroot/uploads/`, return `{ url }`
- Max upload size: 5MB; allowed types: jpg, jpeg, png, webp

## Requirements

### DTOs to update

**`CreateEventRequest`** — add 6 fields:
```csharp
public record CreateEventRequest(
    string Title, string? Description, DateTime StartAt, DateTime EndAt,
    string? Venue, string? Category, string? ImageUrl, string Slug,
    // NEW:
    string? BannerImageUrl, bool IsOnline,
    int? MaxTicketsPerOrder, string? RefundPolicy,
    string? ContentWarning, string? PaymentTerms,
    List<CreateTicketTypeRequest> TicketTypes
);
```

**`UpdateEventRequest`** — add same 6 fields (all nullable)

**`CreateTicketTypeRequest`** — add `SaleStartAt`/`SaleEndAt`:
```csharp
public record CreateTicketTypeRequest(
    string Name, string? Description, decimal Price, int Quota, int MaxPerUser,
    // NEW:
    DateTime? SaleStartAt, DateTime? SaleEndAt
);
```

**`UpdateTicketTypeRequest`** — add `SaleStartAt`/`SaleEndAt` (both nullable)

**`TicketTypeResponse`** — add `SaleStartAt`/`SaleEndAt`:
```csharp
public record TicketTypeResponse(
    Guid Id, string Name, string? Description,
    decimal Price, int Quota, int SoldCount, int AvailableCount,
    int MaxPerUser, DateTime? SaleStartAt, DateTime? SaleEndAt
);
```

**`EventDetailResponse`** — add new event fields:
```csharp
// add to record: string? BannerImageUrl, bool IsOnline, int? MaxTicketsPerOrder,
// string? RefundPolicy, string? ContentWarning, string? PaymentTerms
```

**`EventListItemResponse`** — add `BannerImageUrl`, `IsOnline` (useful for cards)

### New endpoint: File Upload

`POST /api/files/upload`
- Auth: Organizer role required
- Body: `multipart/form-data`, field name `file`
- Validation: max 5MB, types: jpg/jpeg/png/webp
- Saves to `wwwroot/uploads/{guid}.{ext}`
- Returns: `200 { url: "/uploads/{guid}.{ext}" }`
- Error: `400` for invalid type/size, `500` for IO error

### Verify: Publish/Unpublish endpoints

Check `EventsController.cs` for `[HttpPost("{id:guid}/publish")]` and `[HttpPost("{id:guid}/unpublish")]`. If missing, add:
```csharp
[HttpPost("{id:guid}/publish")]
public async Task<IActionResult> PublishEvent(Guid id, CancellationToken ct)
{
    var userId = GetUserId() ?? "";
    return FromResult(await _eventService.PublishEventAsync(id, userId, ct));
}

[HttpPost("{id:guid}/unpublish")]
public async Task<IActionResult> UnpublishEvent(Guid id, CancellationToken ct)
{
    var userId = GetUserId() ?? "";
    return FromResult(await _eventService.UnpublishEventAsync(id, userId, ct));
}
```

## Related Code Files

**Modify:**
- `backend/src/TicketStar.Application/DTOs/Events/EventDtos.cs`
- `backend/src/TicketStar.Application/Services/EventService.cs`
- `backend/src/TicketStar.API/Controllers/EventsController.cs`
- `backend/src/TicketStar.API/Program.cs` (static files + upload size)

**Create:**
- `backend/src/TicketStar.API/Controllers/FilesController.cs`

## Implementation Steps

1. **Update `EventDtos.cs`** — apply all DTO changes listed above

2. **Update `EventService.cs`**:
   - Map new fields in `CreateEventAsync`: `BannerImageUrl`, `IsOnline`, `MaxTicketsPerOrder`, `RefundPolicy`, `ContentWarning`, `PaymentTerms`
   - Map new fields in `UpdateEventAsync`
   - Map `SaleStartAt`/`SaleEndAt` when creating TicketTypes
   - Map new fields in projection queries (EventDetailResponse, TicketTypeResponse)
   - If `PublishEventAsync`/`UnpublishEventAsync` missing: add methods that set `Status = EventStatus.Published/Draft`

3. **Create `FilesController.cs`**:
   ```csharp
   [ApiController]
   [Route("api/files")]
   [Authorize]
   public class FilesController : ApiControllerBase
   {
       private readonly IWebHostEnvironment _env;
       private static readonly HashSet<string> AllowedTypes = [".jpg", ".jpeg", ".png", ".webp"];
       private const long MaxSizeBytes = 5 * 1024 * 1024; // 5MB

       public FilesController(IWebHostEnvironment env) => _env = env;

       [HttpPost("upload")]
       public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
       {
           if (file.Length > MaxSizeBytes)
               return BadRequest(new { message = "File too large (max 5MB)" });
           var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
           if (!AllowedTypes.Contains(ext))
               return BadRequest(new { message = "Only jpg, png, webp allowed" });
           var fileName = $"{Guid.NewGuid()}{ext}";
           var uploadsDir = Path.Combine(_env.WebRootPath, "uploads");
           Directory.CreateDirectory(uploadsDir);
           var filePath = Path.Combine(uploadsDir, fileName);
           await using var stream = System.IO.File.Create(filePath);
           await file.CopyToAsync(stream, ct);
           return Ok(new { url = $"/uploads/{fileName}" });
       }
   }
   ```

4. **Update `Program.cs`**:
   - Add static files middleware: `app.UseStaticFiles();` (before `app.UseRouting()`)
   - Ensure `wwwroot` folder exists or is created at startup
   - Set multipart body size limit if needed:
     ```csharp
     builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 5 * 1024 * 1024);
     ```
   - Add `[RequestSizeLimit]` or `[DisableRequestSizeLimit]` on upload action if Kestrel default is too small

5. **Run `just build`** — verify no compile errors

6. **Quick smoke test** — start API, POST to `/api/files/upload` with a test image, verify `/uploads/filename.jpg` is accessible

## Todo List

- [ ] Update `EventDtos.cs` — all DTO changes
- [ ] Update `EventService.cs` — map new fields in create/update/project
- [ ] Add `SaleStartAt`/`SaleEndAt` mapping for TicketTypes in EventService
- [ ] Check and add publish/unpublish controller actions if missing
- [ ] Create `FilesController.cs`
- [ ] Update `Program.cs` for static files + multipart limits
- [ ] Run `just build`
- [ ] Smoke test file upload endpoint

## Success Criteria

- `just build` passes
- `POST /api/files/upload` returns `{ url }` and file is accessible at URL
- `POST /api/events` accepts all new fields
- `PUT /api/events/{id}` accepts all new fields
- `GET /api/events/{id}` returns all new fields
- `POST /api/events/{id}/publish` + `/unpublish` work

## Risk Assessment

- **Existing data**: New nullable fields default to null — no mapping issues
- **Static files path**: On Windows dev, `wwwroot` must exist; add `Directory.CreateDirectory` safety
- **TicketType.MaxPerUser default**: Service must set default=10 if not provided by caller

## Security Considerations

- File upload: validate extension + MIME type, never trust client filename
- Only allow authenticated organizers to upload (already in `[Authorize]`)
- No path traversal: use `Guid.NewGuid()` as filename, never user-supplied names
- Consider adding organizer ownership check on publish/unpublish (user must own the event)

## Next Steps

→ Phase 03: Frontend wizard components
