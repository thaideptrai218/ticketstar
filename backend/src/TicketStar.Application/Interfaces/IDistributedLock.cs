namespace TicketStar.Application.Interfaces;

public interface IDistributedLock
{
    /// <summary>
    /// Acquires a distributed lock on the specified key.
    /// Returns null if lock cannot be acquired or Redis is unavailable (fail-open).
    /// </summary>
    Task<IDistributedLockHandle?> AcquireAsync(string key, TimeSpan ttl, CancellationToken ct = default);
}

public interface IDistributedLockHandle : IAsyncDisposable
{
    string LockKey { get; }
    Task ReleaseAsync();
}
