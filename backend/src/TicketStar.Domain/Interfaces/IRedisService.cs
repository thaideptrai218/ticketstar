namespace TicketStar.Domain.Interfaces;

public interface IRedisService
{
    Task SetAsync(string key, string value, TimeSpan? ttl = null);
    Task<string?> GetAsync(string key);
    Task<bool> DeleteAsync(string key);
    Task<bool> ExistsAsync(string key);
    Task<long> IncrementAsync(string key);
    Task ExpireAsync(string key, TimeSpan ttl);
}
