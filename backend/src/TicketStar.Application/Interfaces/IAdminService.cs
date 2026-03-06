using TicketStar.Application.Common;

namespace TicketStar.Application.Interfaces;

public interface IAdminService
{
    Task<Result<object>> ListUsersAsync(int page, int pageSize, CancellationToken ct);
    Task<Result<bool>> LockUserAsync(string userId, CancellationToken ct);
    Task<Result<bool>> UnlockUserAsync(string userId, CancellationToken ct);
}
