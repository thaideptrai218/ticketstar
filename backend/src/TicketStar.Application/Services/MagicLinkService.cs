using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TicketStar.Application.DTOs.Auth;
using TicketStar.Application.Interfaces;
using TicketStar.Domain.Entities;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Application.Services;

public class MagicLinkService
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly ILogger<MagicLinkService> _logger;

    public MagicLinkService(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        ILogger<MagicLinkService> logger)
    {
        _db = db;
        _userManager = userManager;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task RequestAsync(string email)
    {
        var user = await UserHelper.EnsureUserAsync(_userManager, email);

        var token = Guid.NewGuid().ToString("N");
        var hashedToken = HashToken(token);

        var entity = new MagicLinkToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = hashedToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            CreatedAt = DateTime.UtcNow
        };
        _db.MagicLinkTokens.Add(entity);
        await _db.SaveChangesAsync();

        // Console stub — no email infra in MVP
        _logger.LogInformation("=== MAGIC LINK TOKEN for {Email}: {Token} ===", email, token);
    }

    public async Task<TokenResponse> VerifyAsync(string token)
    {
        var hashedToken = HashToken(token);
        var entity = await _db.MagicLinkTokens
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.Token == hashedToken && !m.IsUsed);

        if (entity is null)
            throw new UnauthorizedAccessException("Invalid or used magic link token.");

        if (entity.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Magic link token expired.");

        entity.IsUsed = true;
        await _db.SaveChangesAsync();

        return await _tokenService.GenerateTokenPairAsync(entity.User);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
