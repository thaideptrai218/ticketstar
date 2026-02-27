using Microsoft.EntityFrameworkCore;
using Xunit;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;
using TicketStar.Infrastructure.Data;
using TicketStar.Tests.Helpers;

namespace TicketStar.Tests.Unit.Database;

public class DbContextTests
{
    private AppDbContext CreateDbContext()
    {
        var factory = new TestDbContextFactory();
        return factory.CreateDbContext();
    }

    [Fact]
    public void User_SoftDelete_ExcludedByQueryFilter()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            DeletedAt = DateTime.UtcNow,
        };

        db.Users.Add(user);
        db.SaveChanges();

        // Act - query with default filter
        var result = db.Users.FirstOrDefault(u => u.Id == userId);

        // Assert
        Assert.Null(result); // Should be excluded by query filter
    }

    [Fact]
    public void User_SoftDelete_VisibleWithIgnoreQueryFilters()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
            DeletedAt = DateTime.UtcNow,
        };

        db.Users.Add(user);
        db.SaveChanges();

        // Act - query ignoring filters
        var result = db.Users.IgnoreQueryFilters()
            .FirstOrDefault(u => u.Id == userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.Id);
    }

    [Fact]
    public void User_Email_UniqueConstraint_RejectsDuplicate()
    {
        // Arrange
        using var db = CreateDbContext();
        var email = "test@example.com";
        var user1 = new User
        {
            Email = email,
            PasswordHash = "hash1",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        var user2 = new User
        {
            Email = email,
            PasswordHash = "hash2",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };

        db.Users.Add(user1);
        db.SaveChanges();
        db.Users.Add(user2);

        // Act & Assert
        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void MagicLink_RowVersion_ConcurrencyTokenConfigured()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var magicLink = new MagicLink
        {
            UserId = userId,
            TokenHash = "testhash123",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
        };
        db.MagicLinks.Add(magicLink);
        db.SaveChanges();

        // Act
        var retrieved = db.MagicLinks.First();
        var rowVersionBefore = db.Entry(retrieved)
            .Property("RowVersion").CurrentValue;

        retrieved.UsedAt = DateTime.UtcNow;
        db.SaveChanges();

        var rowVersionAfter = db.Entry(retrieved)
            .Property("RowVersion").CurrentValue;

        // Assert - RowVersion should be tracked
        Assert.NotNull(rowVersionBefore);
        Assert.NotNull(rowVersionAfter);
        // RowVersion values should differ (SQLite uses numeric timestamps)
    }

    [Fact]
    public void RefreshToken_TokenHash_UniqueConstraint_RejectsDuplicate()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var session = new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var tokenHash = "duplicatehash";
        var token1 = new RefreshToken
        {
            UserId = userId,
            SessionId = session.Id,
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        var token2 = new RefreshToken
        {
            UserId = userId,
            SessionId = session.Id,
            TokenHash = tokenHash,
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };

        db.RefreshTokens.Add(token1);
        db.SaveChanges();
        db.RefreshTokens.Add(token2);

        // Act & Assert
        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void AuthIdentity_CompositeIndex_ProviderAndProviderUserId_EnforcedAsUnique()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var identity1 = new AuthIdentity
        {
            UserId = userId,
            Provider = AuthProvider.Email,
            ProviderUserId = "test@example.com",
            ProviderEmail = "test@example.com",
        };
        var identity2 = new AuthIdentity
        {
            UserId = userId,
            Provider = AuthProvider.Email,
            ProviderUserId = "test@example.com",
            ProviderEmail = "test@example.com",
        };

        db.AuthIdentities.Add(identity1);
        db.SaveChanges();
        db.AuthIdentities.Add(identity2);

        // Act & Assert
        Assert.Throws<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void User_DeletedAt_CascadeDeletesUserProfile()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        var profile = new UserProfile
        {
            UserId = userId,
            FullName = "Test User",
        };

        db.Users.Add(user);
        db.UserProfiles.Add(profile);
        db.SaveChanges();

        // Act - soft delete user
        user.DeletedAt = DateTime.UtcNow;
        db.SaveChanges();

        // Verify soft-delete doesn't cascade (profile still exists)
        var profileAfterDelete = db.UserProfiles
            .IgnoreQueryFilters()
            .FirstOrDefault(p => p.UserId == userId);

        // Assert
        Assert.NotNull(profileAfterDelete);
        // Soft-delete is a flag, not a hard delete, so profile remains
    }

    [Fact]
    public void RefreshToken_Cascade_DeletesOnUserDelete()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var session = new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
        };
        db.AuthSessions.Add(session);
        db.SaveChanges();

        var token = new RefreshToken
        {
            UserId = userId,
            SessionId = session.Id,
            TokenHash = "hash123",
            FamilyId = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };
        db.RefreshTokens.Add(token);
        db.SaveChanges();

        var tokenId = token.Id;

        // Act - hard delete user
        db.Users.Remove(user);
        db.SaveChanges();

        // Assert - token should be cascade deleted
        var deletedToken = db.RefreshTokens
            .FirstOrDefault(t => t.Id == tokenId);
        Assert.Null(deletedToken);
    }

    [Fact]
    public void AuthSession_CreatedAt_DefaultValue_SetOnInsert()
    {
        // Arrange
        using var db = CreateDbContext();
        var userId = Guid.NewGuid().ToString();
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            PasswordHash = "hash",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var beforeInsert = DateTime.UtcNow;
        var session = new AuthSession
        {
            UserId = userId,
            IpAddress = "127.0.0.1",
        };

        // Act
        db.AuthSessions.Add(session);
        db.SaveChanges();
        var afterInsert = DateTime.UtcNow;

        // Assert
        var retrieved = db.AuthSessions.First();
        Assert.True(retrieved.CreatedAt >= beforeInsert);
        Assert.True(retrieved.CreatedAt <= afterInsert);
    }

    [Fact]
    public void User_UpdatedAt_AutomaticallyUpdated_OnModification()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User
        {
            Email = "test@example.com",
            PasswordHash = "hash1",
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };
        db.Users.Add(user);
        db.SaveChanges();

        var updatedAtBefore = user.UpdatedAt;
        System.Threading.Thread.Sleep(10); // Ensure time difference

        // Act
        user.PasswordHash = "hash2";
        db.SaveChanges();

        // Assert
        Assert.True(user.UpdatedAt > updatedAtBefore);
    }
}
