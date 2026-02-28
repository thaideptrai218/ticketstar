using System.Security.Cryptography;
using System.Text;
using OtpNet;

namespace TicketStar.Application.Services;

/// <summary>
/// Stateless crypto utilities for MFA: AES-256 encryption, TOTP validation, recovery code generation.
/// Kept separate to keep MfaService under 200 lines.
/// </summary>
internal static class MfaCryptoHelper
{
    private const int RecoveryCodeCount = 8;
    private const int RecoveryCodeLength = 8;

    // ── AES-256 ──────────────────────────────────────────────────────────────

    public static string Encrypt(string plaintext, byte[] key)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.GenerateIV();

        using var ms = new MemoryStream();
        ms.Write(aes.IV, 0, aes.IV.Length); // prepend 16-byte IV

        using (var enc = aes.CreateEncryptor())
        using (var cs = new CryptoStream(ms, enc, CryptoStreamMode.Write))
        {
            var bytes = Encoding.UTF8.GetBytes(plaintext);
            cs.Write(bytes, 0, bytes.Length);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    public static string Decrypt(string cipherBase64, byte[] key)
    {
        var raw = Convert.FromBase64String(cipherBase64);

        using var aes = Aes.Create();
        aes.Key = key;
        var iv = raw[..16];
        aes.IV = iv;

        using var ms = new MemoryStream(raw, 16, raw.Length - 16);
        using var dec = aes.CreateDecryptor();
        using var cs = new CryptoStream(ms, dec, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        return sr.ReadToEnd();
    }

    // ── TOTP ─────────────────────────────────────────────────────────────────

    /// <summary>Generates a cryptographically random 20-byte (160-bit) TOTP secret as Base32.</summary>
    public static string GenerateTotpSecret()
    {
        var secretBytes = RandomNumberGenerator.GetBytes(20);
        return Base32Encoding.ToString(secretBytes);
    }

    /// <summary>Verifies a 6-digit TOTP code with ±1 step (90s) tolerance.</summary>
    public static bool VerifyTotp(string base32Secret, string code)
    {
        try
        {
            var secretBytes = Base32Encoding.ToBytes(base32Secret);
            var totp = new Totp(secretBytes);
            return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Builds an otpauth:// URI for QR code generation.</summary>
    public static string BuildOtpAuthUri(string base32Secret, string email, string issuer)
        => $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(email)}" +
           $"?secret={base32Secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits=6&period=30";

    // ── Recovery codes ────────────────────────────────────────────────────────

    /// <summary>Returns (plaintext[], sha256Hashes[]) tuples for 8 one-time codes.</summary>
    public static (List<string> Plain, List<string> Hashes) GenerateRecoveryCodes()
    {
        var plain = new List<string>(RecoveryCodeCount);
        var hashes = new List<string>(RecoveryCodeCount);

        for (int i = 0; i < RecoveryCodeCount; i++)
        {
            // 8 uppercase alphanumeric chars
            var code = GenerateAlphanumericCode(RecoveryCodeLength);
            plain.Add(code);
            hashes.Add(HashCode(code));
        }

        return (plain, hashes);
    }

    public static string HashCode(string code)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(code.ToUpperInvariant()));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string GenerateAlphanumericCode(int length)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit 0/O, 1/I for readability
        var result = new char[length];
        var bytes = RandomNumberGenerator.GetBytes(length);
        for (int i = 0; i < length; i++)
            result[i] = chars[bytes[i] % chars.Length];
        return new string(result);
    }
}
