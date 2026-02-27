using Xunit;
using TicketStar.Application.Services.Security;

namespace TicketStar.Tests.Unit.Security;

public class Argon2PasswordHasherTests
{
    private readonly Argon2PasswordHasher _hasher = new();

    [Fact]
    public void Hash_ProducesValidHash()
    {
        // Arrange
        var password = "TestPassword@123";

        // Act
        var hash = _hasher.Hash(password);

        // Assert
        Assert.NotEmpty(hash);
        Assert.True(hash.Length > 50); // Argon2 produces long hashes
    }

    [Fact]
    public void Hash_ProducesDifferentHashesForSamePassword()
    {
        // Arrange
        var password = "TestPassword@123";

        // Act
        var hash1 = _hasher.Hash(password);
        var hash2 = _hasher.Hash(password);

        // Assert
        Assert.NotEqual(hash1, hash2); // Different salt produces different hash
    }

    [Fact]
    public void Verify_ReturnsTrueForCorrectPassword()
    {
        // Arrange
        var password = "TestPassword@123";
        var hash = _hasher.Hash(password);

        // Act
        var result = _hasher.Verify(password, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Verify_ReturnsFalseForIncorrectPassword()
    {
        // Arrange
        var password = "TestPassword@123";
        var wrongPassword = "WrongPassword@456";
        var hash = _hasher.Hash(password);

        // Act
        var result = _hasher.Verify(wrongPassword, hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Verify_ReturnsFalseForEmptyPassword()
    {
        // Arrange
        var password = "TestPassword@123";
        var hash = _hasher.Hash(password);

        // Act
        var result = _hasher.Verify("", hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Hash_HandlesSpecialCharactersInPassword()
    {
        // Arrange
        var password = "P@ssw0rd!#$%^&*()_+-=[]{}|;:',.<>?/";

        // Act
        var hash = _hasher.Hash(password);
        var result = _hasher.Verify(password, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Hash_HandleUnicodeCharactersInPassword()
    {
        // Arrange
        var password = "Пароль🔒安全 パスワード";

        // Act
        var hash = _hasher.Hash(password);
        var result = _hasher.Verify(password, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Verify_IsCaseSensitive()
    {
        // Arrange
        var password = "TestPassword@123";
        var hash = _hasher.Hash(password);

        // Act
        var result = _hasher.Verify("testpassword@123", hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Hash_ProducesConsistentVerification()
    {
        // Arrange
        var password = "TestPassword@123";
        var hash = _hasher.Hash(password);

        // Act & Assert - Verify multiple times should all succeed
        Assert.True(_hasher.Verify(password, hash));
        Assert.True(_hasher.Verify(password, hash));
        Assert.True(_hasher.Verify(password, hash));
    }
}
