namespace TicketStar.Domain.Enums;

public enum SecurityEventType
{
    Login = 0,
    LoginFailed = 1,
    Logout = 2,
    PasswordChanged = 3,
    PasswordResetRequested = 4,
    EmailChanged = 5,
    EmailChangeRequested = 6,
    RoleChanged = 7,
    AccountLocked = 8,
    AccountUnlocked = 9,
    TokenRefreshed = 10,
    TokenReuseDetected = 11,
    AllSessionsRevoked = 12,
    MagicLinkRequested = 13,
    MagicLinkVerified = 14,
    GoogleOAuthLogin = 15
}
