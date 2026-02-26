using Microsoft.AspNetCore.Identity;
using TicketStar.Domain.Entities;

namespace TicketStar.Application.Services;

/// <summary>
/// Shared helper for find-or-create user pattern used by Google OAuth and Magic Link flows.
/// </summary>
public static class UserHelper
{
    public static async Task<ApplicationUser> EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        string email,
        string fullName = "",
        string? avatarUrl = null)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is not null)
            return user;

        user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = fullName,
            AvatarUrl = avatarUrl,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user);
        if (!result.Succeeded)
            throw new InvalidOperationException($"Failed to create user: {string.Join(", ", result.Errors.Select(e => e.Description))}");

        await userManager.AddToRoleAsync(user, "Attendee");
        return user;
    }
}
