using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using TicketStar.Infrastructure.Data;

namespace TicketStar.Tests.Helpers;

/// <summary>
/// Factory for creating test instances of AppDbContext with SQLite in-memory database.
/// Uses TestAppDbContext which configures SQLite-compatible default values.
/// </summary>
public class TestDbContextFactory : IDisposable
{
    private readonly SqliteConnection _connection;
    private bool _disposed = false;

    public TestDbContextFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        // Enable foreign keys in SQLite
        using (var cmd = _connection.CreateCommand())
        {
            cmd.CommandText = "PRAGMA foreign_keys = ON;";
            cmd.ExecuteNonQuery();
        }
    }

    public AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        var db = new TestAppDbContext(options);

        // Drop existing schema
        db.Database.EnsureDeleted();

        // Create schema using EF Core's model
        db.Database.EnsureCreated();

        return db;
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            _connection?.Close();
            _connection?.Dispose();
            _disposed = true;
        }
    }
}
