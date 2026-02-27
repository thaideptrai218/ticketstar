using System.Linq.Expressions;

namespace TicketStar.Domain.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    void Add(T entity);
    void Update(T entity);
    void Remove(T entity);
    Task ReloadAsync(T entity, CancellationToken ct = default);
    IQueryable<T> Query();
    IQueryable<T> QueryIgnoreFilters();
}
