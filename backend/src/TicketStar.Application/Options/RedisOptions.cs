namespace TicketStar.Application.Options;

public class RedisOptions
{
    public const string SectionName = "Redis";
    public string ConnectionString { get; init; } = "localhost:6379";
}
