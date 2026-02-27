using Xunit;
using TicketStar.Application.Services.Security;

namespace TicketStar.Tests.Unit.Security;

public class CryptoRandomServiceTests
{
    private readonly CryptoRandomService _service = new();

    [Fact]
    public void GenerateToken_ProducesValidBase64Token()
    {
        // Act
        var token = _service.GenerateToken(32);

        // Assert
        Assert.NotEmpty(token);
        // Should only contain URL-safe Base64 characters (no +/=)
        Assert.DoesNotContain("+", token);
        Assert.DoesNotContain("/", token);
        Assert.DoesNotContain("=", token);
    }

    [Fact]
    public void GenerateToken_ProducesDifferentTokensEachCall()
    {
        // Act
        var token1 = _service.GenerateToken(32);
        var token2 = _service.GenerateToken(32);
        var token3 = _service.GenerateToken(32);

        // Assert
        Assert.NotEqual(token1, token2);
        Assert.NotEqual(token2, token3);
        Assert.NotEqual(token1, token3);
    }

    [Fact]
    public void GenerateToken_RespectsByteLength()
    {
        // Arrange & Act & Assert
        var token8 = _service.GenerateToken(8);
        var token32 = _service.GenerateToken(32);
        var token64 = _service.GenerateToken(64);

        // Longer tokens should generally be longer in base64 representation
        Assert.True(token32.Length > token8.Length || token32.Length == token8.Length);
        Assert.True(token64.Length >= token32.Length);
    }

    [Fact]
    public void GenerateToken_DefaultsTo32Bytes()
    {
        // Act
        var token = _service.GenerateToken();

        // Assert
        Assert.NotEmpty(token);
        // 32 bytes -> 43 characters in base64 (before padding removal)
        Assert.True(token.Length >= 40 && token.Length <= 50);
    }

    [Fact]
    public void GenerateToken_Handles64ByteToken()
    {
        // Act
        var token = _service.GenerateToken(64);

        // Assert
        Assert.NotEmpty(token);
        // 64 bytes -> ~86 characters in base64
        Assert.True(token.Length >= 80 && token.Length <= 95);
    }

    [Fact]
    public void GenerateToken_Handles16ByteToken()
    {
        // Act
        var token = _service.GenerateToken(16);

        // Assert
        Assert.NotEmpty(token);
        // 16 bytes -> 24 characters in base64 (before padding removal)
        Assert.True(token.Length >= 20 && token.Length <= 30);
    }

    [Fact]
    public void GenerateToken_ProducesUrlSafeCharacters()
    {
        // Act
        var token = _service.GenerateToken(32);

        // Assert
        var validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        Assert.True(token.All(c => validChars.Contains(c)), "Token contains invalid characters");
    }

    [Fact]
    public void GenerateId_ProducesValidGuid()
    {
        // Act
        var id = _service.GenerateId();

        // Assert
        Assert.NotEmpty(id);
        Assert.Equal(32, id.Length); // 32 hex characters (GUID without hyphens)
        Assert.True(Guid.TryParse(id, out _)); // Should parse as valid GUID
    }

    [Fact]
    public void GenerateId_ProducesDifferentIdsEachCall()
    {
        // Act
        var id1 = _service.GenerateId();
        var id2 = _service.GenerateId();
        var id3 = _service.GenerateId();

        // Assert
        Assert.NotEqual(id1, id2);
        Assert.NotEqual(id2, id3);
        Assert.NotEqual(id1, id3);
    }

    [Fact]
    public void GenerateId_ProducesLowercaseHexadecimal()
    {
        // Act
        var id = _service.GenerateId();

        // Assert
        Assert.True(id.All(c => "0123456789abcdef".Contains(c)), "ID contains invalid hex characters");
    }

    [Fact]
    public void GenerateToken_WithZeroLength()
    {
        // Act
        var token = _service.GenerateToken(0);

        // Assert - Should handle gracefully
        Assert.NotNull(token);
    }

    [Fact]
    public void GenerateToken_IsThreadSafe()
    {
        // Arrange
        var tokens = new List<string>();
        var lockObj = new object();

        // Act - Generate tokens from multiple threads
        var tasks = Enumerable.Range(0, 10).Select(_ =>
            Task.Run(() =>
            {
                var token = _service.GenerateToken(32);
                lock (lockObj)
                {
                    tokens.Add(token);
                }
            })
        ).ToList();

        Task.WaitAll(tasks.ToArray());

        // Assert - All tokens should be unique
        Assert.Equal(tokens.Count, tokens.Distinct().Count());
    }

    [Fact]
    public void GenerateToken_ProducesHighEntropyValues()
    {
        // Act - Generate many tokens and check distribution
        var tokens = Enumerable.Range(0, 100)
            .Select(_ => _service.GenerateToken(32))
            .ToList();

        // Assert - All tokens should be different (extremely unlikely to have duplicates with CSPRNG)
        Assert.Equal(100, tokens.Distinct().Count());
    }
}
