---
phase: 2
title: "Backend API - Expose City in DTOs and filter"
status: pending
effort: 30min
---

# Phase 2: Backend API

## Overview

Add `City` to request/response DTOs, map in service layer, update location filter.

## Files to Modify

- `backend/src/TicketStar.Application/DTOs/EventDtos.cs` — add City to 4 DTOs
- `backend/src/TicketStar.Application/Services/EventService.cs` — map City in CRUD
- `backend/src/TicketStar.Infrastructure/Data/Repositories/EventRepository.cs` — update location filter

## Implementation Steps

1. **Update DTOs in EventDtos.cs**
   - `CreateEventRequest`: add `public string? City { get; set; }`
   - `UpdateEventRequest`: add `public string? City { get; set; }`
   - `EventDetailResponse`: add `public string? City { get; set; }`
   - `EventListItemResponse`: add `public string? City { get; set; }`

2. **Map City in EventService.cs**
   - In Create method: set `City = request.City` alongside Venue mapping
   - In Update method: set `City = request.City` alongside Venue mapping
   - In detail response projection: include `City = event.City`
   - In list response projection: include `City = event.City`

3. **Update location filter in EventRepository**
   - Current: filters where `Venue.Contains(location)`
   - Change to: `Venue.Contains(location) || City.Contains(location)`
   - Handle nullability: `(e.City != null && e.City.Contains(location))`

## Success Criteria

- [ ] City accepted in create/update requests
- [ ] City returned in detail/list responses
- [ ] Location filter matches against both Venue and City
- [ ] Existing events without City still work (nullable)
