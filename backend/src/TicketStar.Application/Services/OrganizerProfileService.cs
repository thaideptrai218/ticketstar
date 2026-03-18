using TicketStar.Application.Common;
using TicketStar.Application.DTOs;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Interfaces;

namespace TicketStar.Application.Services;

public class OrganizerProfileService : IOrganizerProfileService
{
    private readonly IOrganizerProfileRepository _profileRepo;
    private readonly IUserRepository _userRepo;
    private readonly IUnitOfWork _unitOfWork;

    public OrganizerProfileService(
        IOrganizerProfileRepository profileRepo,
        IUserRepository userRepo,
        IUnitOfWork unitOfWork)
    {
        _profileRepo = profileRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<OrganizerProfileResponse?> GetByUserIdAsync(string userId, CancellationToken ct)
    {
        var profile = await _profileRepo.GetByUserIdAsync(userId, ct);
        return profile == null ? null : MapToResponse(profile);
    }

    public async Task<Result<OrganizerProfileResponse>> CreateAsync(string userId, CreateOrganizerProfileRequest request, CancellationToken ct)
    {
        var existing = await _profileRepo.GetByUserIdAsync(userId, ct);
        if (existing != null)
            return Result<OrganizerProfileResponse>.Failure("Organizer profile already exists", ResultError.Conflict);

        var profile = new OrganizerProfile
        {
            UserId = userId,
            OrganizationName = request.OrganizationName,
            Description = request.Description,
            Phone = request.Phone,
            Address = request.Address,
            Website = request.Website,
            FacebookUrl = request.FacebookUrl,
            InstagramUrl = request.InstagramUrl,
            IsComplete = !string.IsNullOrWhiteSpace(request.OrganizationName),
            CreatedAt = DateTime.UtcNow
        };

        _profileRepo.Add(profile);

        // Set user as organizer
        var user = await _userRepo.GetByIdAsync(userId, ct);
        if (user != null)
        {
            user.IsOrganizer = true;
            _userRepo.Update(user);
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return Result<OrganizerProfileResponse>.Success(MapToResponse(profile));
    }

    public async Task<Result<OrganizerProfileResponse>> UpdateAsync(string userId, UpdateOrganizerProfileRequest request, CancellationToken ct)
    {
        var profile = await _profileRepo.GetByUserIdAsync(userId, ct);
        if (profile == null)
            return Result<OrganizerProfileResponse>.Failure("Organizer profile not found", ResultError.NotFound);

        profile.OrganizationName = request.OrganizationName;
        profile.Description = request.Description;
        profile.Phone = request.Phone;
        profile.Address = request.Address;
        profile.Website = request.Website;
        profile.FacebookUrl = request.FacebookUrl;
        profile.InstagramUrl = request.InstagramUrl;
        profile.IsComplete = !string.IsNullOrWhiteSpace(request.OrganizationName);
        profile.UpdatedAt = DateTime.UtcNow;

        _profileRepo.Update(profile);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result<OrganizerProfileResponse>.Success(MapToResponse(profile));
    }

    private static OrganizerProfileResponse MapToResponse(OrganizerProfile p) => new(
        p.Id, p.OrganizationName, p.Description, p.LogoUrl,
        p.Phone, p.Address, p.Website, p.FacebookUrl, p.InstagramUrl,
        p.IsComplete, p.CreatedAt);
}
