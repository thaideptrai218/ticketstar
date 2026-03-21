using TicketStar.Application.Common;

namespace TicketStar.Application.Interfaces;

public interface IAdminService
{
    Task<Result<object>> ListUsersAsync(int page, int pageSize, CancellationToken ct);
    Task<Result<object>> ListOrganizersAsync(CancellationToken ct);
    Task<Result<bool>> LockUserAsync(string userId, CancellationToken ct);
    Task<Result<bool>> UnlockUserAsync(string userId, CancellationToken ct);
    Task<Result<bool>> RevokeOrganizerAsync(string userId, CancellationToken ct);
    Task<Result<object>> GetStatsAsync(CancellationToken ct);
}
