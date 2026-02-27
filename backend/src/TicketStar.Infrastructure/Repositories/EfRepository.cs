using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TicketStar.Domain.Interfaces;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Infrastructure.Repositories;

/// <summary>
/// Generic EF Core repository wrapping DbSet operations.
/// </summary>
public class EfRepository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext Db;
    protected readonly DbSet<T> DbSet;

    public EfRepository(AppDbContext db)
    {
        Db = db;
        DbSet = db.Set<T>();
    }

    public async Task<T?> GetByIdAsync(string id, CancellationToken ct = default)
        => await DbSet.FindAsync(new object[] { id }, ct);

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await DbSet.FindAsync(new object[] { id }, ct);

    public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => await DbSet.FirstOrDefaultAsync(predicate, ct);

    public async Task<List<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default)
        => predicate is null
            ? await DbSet.ToListAsync(ct)
            : await DbSet.Where(predicate).ToListAsync(ct);

    public async Task<bool> AnyAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
        => await DbSet.AnyAsync(predicate, ct);

    public void Add(T entity) => DbSet.Add(entity);
    public void Update(T entity) => DbSet.Update(entity);
    public void Remove(T entity) => DbSet.Remove(entity);

    public async Task ReloadAsync(T entity, CancellationToken ct = default)
        => await Db.Entry(entity).ReloadAsync(ct);

    public IQueryable<T> Query() => DbSet.AsQueryable();
    public IQueryable<T> QueryIgnoreFilters() => DbSet.IgnoreQueryFilters();
}
