using System.Text;
using Isopoh.Cryptography.Argon2;
using Isopoh.Cryptography.SecureArray;
using TicketStar.Application.Interfaces;

namespace TicketStar.Application.Services.Security;

/// <summary>
/// Argon2id password hasher. OWASP 2025 recommended parameters: t=3, m=64MB, p=4.
/// Stateless and thread-safe -- safe for singleton registration.
/// </summary>
public class Argon2PasswordHasher : IPasswordHasher
{
    // OWASP 2025: t=3, m=64MB, p=4
    private const int TimeCost = 3;
    private const int MemoryCost = 65536; // 64MB
    private const int Parallelism = 4;
    private const int HashLength = 32;

    public string Hash(string password)
    {
        return Argon2.Hash(
            password,
            TimeCost,
            MemoryCost,
            Parallelism,
            Argon2Type.HybridAddressing,
            HashLength,
            SecureArray.DefaultCall);
    }

    public bool Verify(string password, string hash)
    {
        return Argon2.Verify(hash, password, SecureArray.DefaultCall);
    }
}
