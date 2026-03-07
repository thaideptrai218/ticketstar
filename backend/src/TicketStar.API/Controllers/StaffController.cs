using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.DTOs.Staff;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/events/{eventId:guid}/staff")]
public class StaffController : ApiControllerBase
{
    private readonly IStaffService _staffService;

    public StaffController(IStaffService staffService)
    {
        _staffService = staffService;
    }

    [HttpGet("/api/staff/my-events")]
    public async Task<IActionResult> GetMyStaffEvents(CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _staffService.GetMyStaffEventsAsync(userId, ct));
    }

    [HttpGet]
    public async Task<IActionResult> GetEventStaff(Guid eventId, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _staffService.GetEventStaffAsync(userId, eventId, ct));
    }

    [HttpPost]
    public async Task<IActionResult> AssignStaff(Guid eventId, [FromBody] AssignStaffRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _staffService.AssignStaffAsync(userId, eventId, request, ct));
    }

    [HttpDelete("{staffUserId}")]
    public async Task<IActionResult> RemoveStaff(Guid eventId, string staffUserId, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _staffService.RemoveStaffAsync(userId, eventId, staffUserId, ct));
    }
}
