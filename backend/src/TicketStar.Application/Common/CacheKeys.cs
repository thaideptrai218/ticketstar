namespace TicketStar.Application.Common;

public static class CacheKeys
{
    private const string Prefix = "ticketstar";

    // Event caching
    public static string EventList(int page, int pageSize, string? filter = null, string? search = null, string? location = null, string? category = null, DateTime? dateFrom = null, DateTime? dateTo = null)
        => $"{Prefix}:event:list:{page}:{pageSize}:{filter ?? "all"}:{search ?? ""}:{location ?? ""}:{category ?? ""}:{dateFrom:yyyyMMdd}:{dateTo:yyyyMMdd}";

    public static string EventDetail(Guid slug) => $"{Prefix}:event:detail:{slug}";
    public static string EventStats(Guid eventId) => $"{Prefix}:event:stats:{eventId}";
    public static string EventBySlug(string slug) => $"{Prefix}:event:slug:{slug}";

    // Ticket quota locking
    public static string TicketQuotaLock(Guid ticketTypeId) => $"{Prefix}:ticket:quota:{ticketTypeId}:lock";
    public static string TicketQuotaCount(Guid ticketTypeId) => $"{Prefix}:ticket:quota:{ticketTypeId}:count";

    // Order processing
    public static string OrderProcessing(Guid orderId) => $"{Prefix}:order:processing:{orderId}";

    // Distributed locks
    public static string DistributedLock(string resource) => $"{Prefix}:lock:{resource}";
}
