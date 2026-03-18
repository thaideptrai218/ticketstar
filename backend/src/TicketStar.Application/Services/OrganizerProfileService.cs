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

    public async Task<List<OrganizerProfileResponse>> GetAllByUserIdAsync(string userId, CancellationToken ct)
    {
        var profiles = await _profileRepo.GetAllByUserIdAsync(userId, ct);
        return profiles.Select(MapToResponse).ToList();
    }

    public async Task<Result<OrganizerProfileResponse>> CreateAsync(string userId, CreateOrganizerProfileRequest request, CancellationToken ct)
    {
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

        // Ensure user has organizer flag set
        var user = await _userRepo.GetByIdAsync(userId, ct);
        if (user != null && !user.IsOrganizer)
        {
            user.IsOrganizer = true;
            _userRepo.Update(user);
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return Result<OrganizerProfileResponse>.Success(MapToResponse(profile));
    }

    public async Task<Result<OrganizerProfileResponse>> UpdateAsync(string userId, UpdateOrganizerProfileRequest request, CancellationToken ct)
    {
        // Updates the first (oldest) profile for the user — kept for backwards compatibility
        var profile = await _profileRepo.GetByUserIdAsync(userId, ct);
        if (profile == null)
            return Result<OrganizerProfileResponse>.Failure("Organizer profile not found", ResultError.NotFound);

        return await ApplyUpdate(profile, request, ct);
    }

    public async Task<Result<OrganizerProfileResponse>> UpdateByIdAsync(string userId, string profileId, UpdateOrganizerProfileRequest request, CancellationToken ct)
    {
        var profile = await _profileRepo.GetByIdAsync(profileId, ct);
        if (profile == null)
            return Result<OrganizerProfileResponse>.Failure("Organizer profile not found", ResultError.NotFound);
        if (profile.UserId != userId)
            return Result<OrganizerProfileResponse>.Failure("Access denied", ResultError.Forbidden);

        return await ApplyUpdate(profile, request, ct);
    }

    private async Task<Result<OrganizerProfileResponse>> ApplyUpdate(OrganizerProfile profile, UpdateOrganizerProfileRequest request, CancellationToken ct)
    {
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
        p.Id, p.UserId, p.OrganizationName, p.Description, p.LogoUrl,
        p.Phone, p.Address, p.Website, p.FacebookUrl, p.InstagramUrl,
        p.IsComplete, p.CreatedAt);
}
