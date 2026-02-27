namespace TicketStar.Application.Interfaces;

public interface ISecureRandom
{
    /// <summary>Generate a URL-safe Base64 token of specified byte length.</summary>
    string GenerateToken(int byteLength = 32);

    /// <summary>Generate a new GUID string (no hyphens).</summary>
    string GenerateId();
}
