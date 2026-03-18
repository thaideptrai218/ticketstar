namespace TicketStar.Application.Interfaces;

public interface IEmailService
{
    /// <summary>Sends a collaborator invite email with an accept link.</summary>
    Task SendCollaboratorInviteAsync(
        string toEmail,
        string eventTitle,
        string organizerName,
        string inviteToken,
        string permissionLevel,
        CancellationToken ct = default);
}
