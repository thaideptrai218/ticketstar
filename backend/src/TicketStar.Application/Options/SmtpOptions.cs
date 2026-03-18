namespace TicketStar.Application.Options;

public class SmtpOptions
{
    public bool Enabled { get; set; } = false;
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public bool Secure { get; set; } = true;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string FromName { get; set; } = "TicketStar";
    public string AppBaseUrl { get; set; } = "http://localhost:3001";
}
