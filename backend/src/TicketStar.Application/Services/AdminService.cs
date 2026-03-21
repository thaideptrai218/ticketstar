using Microsoft.EntityFrameworkCore;
using TicketStar.Application.Common;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Enums;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class AdminService : IAdminService
{
    private readonly IUserRepository _userRepo;
    private readonly IOrganizerProfileRepository _organizerProfileRepo;
    private readonly IOrderRepository _orderRepo;
    private readonly IEventRepository _eventRepo;
    private readonly ITicketRepository _ticketRepo;
    private readonly IUnitOfWork _unitOfWork;

    public AdminService(
        IUserRepository userRepo,
        IOrganizerProfileRepository organizerProfileRepo,
        IOrderRepository orderRepo,
        IEventRepository eventRepo,
        ITicketRepository ticketRepo,
        IUnitOfWork unitOfWork)
    {
        _userRepo = userRepo;
        _organizerProfileRepo = organizerProfileRepo;
        _orderRepo = orderRepo;
        _eventRepo = eventRepo;
        _ticketRepo = ticketRepo;
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
                u.IsOrganizer,
                OrganizationName = u.OrganizerProfiles.FirstOrDefault() != null ? u.OrganizerProfiles.First().OrganizationName : null,
                u.EmailVerified,
                IsLocked = u.LockedUntil.HasValue && u.LockedUntil > DateTime.UtcNow,
                u.CreatedAt
            })
            .ToListAsync(ct);

        return Result<object>.Success(new { items = users, total, page, pageSize });
    }

    public async Task<Result<object>> ListOrganizersAsync(CancellationToken ct)
    {
        var organizers = await _organizerProfileRepo.Query()
            .OrderBy(p => p.OrganizationName)
            .Select(p => new
            {
                p.Id,
                p.UserId,
                p.OrganizationName,
                p.IsComplete
            })
            .ToListAsync(ct);

        return Result<object>.Success(organizers);
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

    public async Task<Result<object>> GetStatsAsync(CancellationToken ct)
    {
        var userCount = await _userRepo.Query().CountAsync(ct);
        var eventCount = await _eventRepo.Query().CountAsync(ct);
        var orderCount = await _orderRepo.Query().CountAsync(ct);
        var ticketCount = await _ticketRepo.Query().CountAsync(ct);
        var totalRevenue = await _orderRepo.Query()
            .Where(o => o.Status == OrderStatus.Paid)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;
        var pendingOrders = await _orderRepo.Query()
            .Where(o => o.Status == OrderStatus.Pending)
            .CountAsync(ct);

        // Recent events (last 5)
        var recentEvents = await _eventRepo.Query()
            .OrderByDescending(e => e.CreatedAt)
            .Take(5)
            .Select(e => new { e.Id, e.Title, e.Status, e.CreatedAt })
            .ToListAsync(ct);

        // Recent orders (last 5)
        var recentOrders = await _orderRepo.Query()
            .OrderByDescending(o => o.CreatedAt)
            .Take(5)
            .Select(o => new { o.Id, o.Status, o.TotalAmount, o.CreatedAt })
            .ToListAsync(ct);

        return Result<object>.Success(new
        {
            userCount,
            eventCount,
            orderCount,
            ticketCount,
            totalRevenue,
            pendingOrders,
            recentEvents,
            recentOrders
        });
    }

    public async Task<Result<bool>> RevokeOrganizerAsync(string userId, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(userId, ct);
        if (user == null)
            return Result<bool>.Failure("User not found", ResultError.NotFound);

        user.IsOrganizer = false;
        user.UpdatedAt = DateTime.UtcNow;
        _userRepo.Update(user);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }
}
