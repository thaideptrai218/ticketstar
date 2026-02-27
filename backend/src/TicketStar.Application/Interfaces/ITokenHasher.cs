namespace TicketStar.Application.Interfaces;

public interface ITokenHasher
{
    /// <summary>SHA-256 hash a token. Returns lowercase hex string (64 chars).</summary>
    string Hash(string token);

    /// <summary>Verify a plaintext token against a stored hash using constant-time comparison.</summary>
    bool Verify(string token, string hash);
}
