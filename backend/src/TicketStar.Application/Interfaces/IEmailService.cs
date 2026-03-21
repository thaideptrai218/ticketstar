namespace TicketStar.Application.Interfaces;

public interface IEmailService
{
    /// <summary>Sends a magic link login email.</summary>
    Task SendMagicLinkAsync(
        string toEmail,
        string token,
        CancellationToken ct = default);

    /// <summary>Sends a collaborator invite email with an accept link.</summary>
    Task SendCollaboratorInviteAsync(
        string toEmail,
        string eventTitle,
        string organizerName,
        string inviteToken,
        string permissionLevel,
        CancellationToken ct = default);
}
