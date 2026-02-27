using System.Security.Cryptography;
using System.Text;
using TicketStar.Application.Interfaces;

namespace TicketStar.Application.Services.Security;

/// <summary>
/// SHA-256 token hasher for refresh tokens, magic links, and email change tokens.
/// Stateless and thread-safe -- safe for singleton registration.
/// </summary>
public class Sha256TokenHasher : ITokenHasher
{
    public string Hash(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>
    /// RED TEAM H3 FIX: constant-time comparison to prevent timing side-channel attacks.
    /// </summary>
    public bool Verify(string token, string hash)
    {
        var tokenHashBytes = Encoding.UTF8.GetBytes(Hash(token));
        var storedHashBytes = Encoding.UTF8.GetBytes(hash);
        return CryptographicOperations.FixedTimeEquals(tokenHashBytes, storedHashBytes);
    }
}
