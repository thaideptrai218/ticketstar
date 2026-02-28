namespace TicketStar.Application.Options;

public class MfaOptions
{
    public const string SectionName = "Mfa";

    /// <summary>32-byte base64-encoded key for AES-256 encryption of TOTP secrets.</summary>
    public string EncryptionKey { get; init; } = "";

    public string Issuer { get; init; } = "TicketStar";
}
