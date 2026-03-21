using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin")]
public class AdminController : ApiControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        return FromResult(await _adminService.GetStatsAsync(ct));
    }

    [HttpGet("organizers")]
    public async Task<IActionResult> ListOrganizers(CancellationToken ct)
    {
        return FromResult(await _adminService.ListOrganizersAsync(ct));
    }

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        return FromResult(await _adminService.ListUsersAsync(page, pageSize, ct));
    }

    [HttpPost("users/{id}/lock")]
    public async Task<IActionResult> LockUser(string id, CancellationToken ct)
    {
        return FromResult(await _adminService.LockUserAsync(id, ct));
    }

    [HttpPost("users/{id}/unlock")]
    public async Task<IActionResult> UnlockUser(string id, CancellationToken ct)
    {
        return FromResult(await _adminService.UnlockUserAsync(id, ct));
    }

    [HttpPost("users/{id}/revoke-organizer")]
    public async Task<IActionResult> RevokeOrganizer(string id, CancellationToken ct)
    {
        return FromResult(await _adminService.RevokeOrganizerAsync(id, ct));
    }
}
