using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.Common;
using TicketStar.Application.Interfaces;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/account")]
public class AccountController : ApiControllerBase
{
    private readonly IAdminService _adminService;

    public AccountController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>
    /// Self-service: any authenticated user can enable organizer mode on their own account.
    /// This allows a user to be both an attendee and an organizer simultaneously.
    /// </summary>
    [HttpPost("become-organizer")]
    public async Task<IActionResult> BecomeOrganizer(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null)
            return Unauthorized();

        return FromResult(await _adminService.GrantOrganizerAsync(userId, ct));
    }
}
