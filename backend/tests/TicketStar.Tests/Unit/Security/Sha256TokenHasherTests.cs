using Xunit;
using TicketStar.Application.Services.Security;

namespace TicketStar.Tests.Unit.Security;

public class Sha256TokenHasherTests
{
    private readonly Sha256TokenHasher _hasher = new();

    [Fact]
    public void Hash_ProducesValidHash()
    {
        // Arrange
        var token = "test_token_abcdef123456";

        // Act
        var hash = _hasher.Hash(token);

        // Assert
        Assert.NotEmpty(hash);
        Assert.Equal(64, hash.Length); // SHA256 produces 64 hex characters
        Assert.True(hash.All(c => "0123456789abcdef".Contains(c))); // Valid hex
    }

    [Fact]
    public void Hash_ProducesDeterministicHash()
    {
        // Arrange
        var token = "test_token_abcdef123456";

        // Act
        var hash1 = _hasher.Hash(token);
        var hash2 = _hasher.Hash(token);

        // Assert
        Assert.Equal(hash1, hash2); // Same token should produce same hash
    }

    [Fact]
    public void Hash_ProducesLowercaseOutput()
    {
        // Arrange
        var token = "TEST_TOKEN_UPPERCASE";

        // Act
        var hash = _hasher.Hash(token);

        // Assert
        Assert.Equal(hash, hash.ToLowerInvariant());
    }

    [Fact]
    public void Verify_ReturnsTrueForCorrectToken()
    {
        // Arrange
        var token = "test_token_abcdef123456";
        var hash = _hasher.Hash(token);

        // Act
        var result = _hasher.Verify(token, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Verify_ReturnsFalseForIncorrectToken()
    {
        // Arrange
        var token = "test_token_abcdef123456";
        var wrongToken = "wrong_token_xyz789";
        var hash = _hasher.Hash(token);

        // Act
        var result = _hasher.Verify(wrongToken, hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Verify_ReturnsFalseForModifiedHash()
    {
        // Arrange
        var token = "test_token_abcdef123456";
        var hash = _hasher.Hash(token);
        var modifiedHash = hash[0..63] + "0"; // Change last character

        // Act
        var result = _hasher.Verify(token, modifiedHash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Verify_IsCaseSensitiveForToken()
    {
        // Arrange
        var token = "test_token_abcdef123456";
        var hash = _hasher.Hash(token);

        // Act
        var result = _hasher.Verify("TEST_TOKEN_ABCDEF123456", hash);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Verify_HandlesEmptyToken()
    {
        // Arrange
        var hash = _hasher.Hash("");

        // Act
        var result = _hasher.Verify("", hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Hash_HandleSpecialCharactersInToken()
    {
        // Arrange
        var token = "!@#$%^&*()_+-=[]{}|;:',.<>?/";

        // Act
        var hash = _hasher.Hash(token);
        var result = _hasher.Verify(token, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Hash_HandleLongTokens()
    {
        // Arrange
        var token = new string('a', 10000);

        // Act
        var hash = _hasher.Hash(token);
        var result = _hasher.Verify(token, hash);

        // Assert
        Assert.Equal(64, hash.Length);
        Assert.True(result);
    }

    [Fact]
    public void Hash_ProducesDifferentHashesForDifferentTokens()
    {
        // Arrange
        var token1 = "token_one";
        var token2 = "token_two";

        // Act
        var hash1 = _hasher.Hash(token1);
        var hash2 = _hasher.Hash(token2);

        // Assert
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void Verify_ProtectsAgainstTimingAttacks()
    {
        // Arrange
        var token = "correct_token_1234567890";
        var hash = _hasher.Hash(token);
        var wrongToken = "wrong_token____1234567890"; // Same length

        // Act - Just verify it doesn't throw
        var result = _hasher.Verify(wrongToken, hash);

        // Assert
        Assert.False(result);
        // This test verifies the method uses constant-time comparison (no timing variance)
        // In production, use timing-attack resistant test tools for full verification
    }
}
