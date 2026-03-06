using Microsoft.EntityFrameworkCore;
using TicketStar.Application.Common;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class AdminService : IAdminService
{
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;

    public AdminService(IUserRepository userRepo, IUnitOfWork unitOfWork)
    {
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<object>> ListUsersAsync(int page, int pageSize, CancellationToken ct)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(1, page);

        var query = _userRepo.Query().OrderByDescending(u => u.CreatedAt);
        var total = await query.CountAsync(ct);
        var users = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                Role = u.Role.ToString(),
                u.EmailVerified,
                IsLocked = u.LockedUntil.HasValue && u.LockedUntil > DateTime.UtcNow,
                u.CreatedAt
            })
            .ToListAsync(ct);

        return Result<object>.Success(new { items = users, total, page, pageSize });
    }

    public async Task<Result<bool>> LockUserAsync(string userId, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(userId, ct);
        if (user == null)
            return Result<bool>.Failure("User not found", ResultError.NotFound);

        user.LockedUntil = DateTime.UtcNow.AddYears(100);
        user.UpdatedAt = DateTime.UtcNow;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> UnlockUserAsync(string userId, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(userId, ct);
        if (user == null)
            return Result<bool>.Failure("User not found", ResultError.NotFound);

        user.LockedUntil = null;
        user.FailedLoginCount = 0;
        user.UpdatedAt = DateTime.UtcNow;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }
}
