using TicketStar.Application.Common;
using TicketStar.Application.DTOs;

namespace TicketStar.Application.Interfaces;

public interface IOrganizerProfileService
{
    Task<OrganizerProfileResponse?> GetByUserIdAsync(string userId, CancellationToken ct);
    Task<Result<OrganizerProfileResponse>> CreateAsync(string userId, CreateOrganizerProfileRequest request, CancellationToken ct);
    Task<Result<OrganizerProfileResponse>> UpdateAsync(string userId, UpdateOrganizerProfileRequest request, CancellationToken ct);
}
