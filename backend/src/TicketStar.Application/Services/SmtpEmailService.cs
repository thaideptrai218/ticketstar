using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TicketStar.Application.Interfaces;
using TicketStar.Application.Options;

namespace TicketStar.Application.Services;

// SMTP email service — sends transactional emails via Gmail or any SMTP provider
public class SmtpEmailService : IEmailService
{
    private readonly SmtpOptions _opts;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<SmtpOptions> opts, ILogger<SmtpEmailService> logger)
    {
        _opts = opts.Value;
        _logger = logger;
    }

    public async Task SendCollaboratorInviteAsync(
        string toEmail,
        string eventTitle,
        string organizerName,
        string inviteToken,
        string permissionLevel,
        CancellationToken ct = default)
    {
        if (!_opts.Enabled)
        {
            _logger.LogWarning("=== DEV ONLY - Collaborator invite token for {Email}: {Token} ===", toEmail, inviteToken);
            return;
        }

        if (string.IsNullOrWhiteSpace(_opts.From))
        {
            _logger.LogWarning("SMTP From address is not configured — skipping invite email to {Email}", toEmail);
            return;
        }

        var acceptUrl = $"{_opts.AppBaseUrl}/invite/{inviteToken}";

        var body = $"""
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="color:#1c1917">Bạn được mời cộng tác</h2>
              <p style="color:#57534e"><strong>{organizerName}</strong> đã mời bạn tham gia sự kiện
                <strong>{eventTitle}</strong> với vai trò <strong>{permissionLevel}</strong>.</p>
              <a href="{acceptUrl}"
                 style="display:inline-block;margin-top:16px;padding:12px 24px;background:#f59e0b;
                        color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
                Chấp nhận lời mời
              </a>
              <p style="margin-top:24px;color:#a8a29e;font-size:12px">
                Link có hiệu lực trong 72 giờ. Nếu bạn không mong đợi lời mời này, hãy bỏ qua email này.
              </p>
            </div>
            """;

        using var message = new MailMessage
        {
            From = new MailAddress(_opts.From, _opts.FromName),
            Subject = $"Lời mời cộng tác: {eventTitle}",
            Body = body,
            IsBodyHtml = true,
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(_opts.Host, _opts.Port)
        {
            EnableSsl = _opts.Secure,
            Credentials = new NetworkCredential(_opts.User, _opts.Password),
        };

        await client.SendMailAsync(message, ct);
        _logger.LogInformation("Collaborator invite email sent to {Email} for event {Event}", toEmail, eventTitle);
    }
}
