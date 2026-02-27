namespace TicketStar.Application.Interfaces;

public interface IPasswordHasher
{
    /// <summary>Hash a plaintext password using Argon2id.</summary>
    string Hash(string password);

    /// <summary>Verify a plaintext password against a stored hash.</summary>
    bool Verify(string password, string hash);
}
