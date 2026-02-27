using System.Security.Cryptography;
using TicketStar.Application.Interfaces;

namespace TicketStar.Application.Services.Security;

/// <summary>
/// Cryptographically secure random token generator using RandomNumberGenerator (CSPRNG).
/// Stateless and thread-safe -- safe for singleton registration.
/// </summary>
public class CryptoRandomService : ISecureRandom
{
    public string GenerateToken(int byteLength = 32)
    {
        var bytes = RandomNumberGenerator.GetBytes(byteLength);
        // URL-safe Base64: replace +/= with -_
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public string GenerateId()
    {
        return Guid.NewGuid().ToString("N");
    }
}
