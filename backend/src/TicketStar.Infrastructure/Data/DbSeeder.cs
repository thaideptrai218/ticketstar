using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TicketStar.Domain.Entities;
using TicketStar.Domain.Enums;

namespace TicketStar.Infrastructure.Data;

public class DbSeeder
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<DbSeeder> _logger;

    public DbSeeder(AppDbContext db, IConfiguration config, ILogger<DbSeeder> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task SeedAsync(Func<string, string> hashPassword)
    {
        var adminEmail = _config["Admin:Email"] ?? "admin@ticketstar.dev";
        var adminPassword = _config["Admin:Password"] ?? "Admin@123!";

        // Skip if admin already exists (ignoring soft-delete filter)
        var exists = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == adminEmail);

        if (exists)
        {
            _logger.LogInformation("Admin user already exists, skipping seed.");
            return;
        }

        var adminId = Guid.NewGuid().ToString();

        var user = new User
        {
            Id = adminId,
            Email = adminEmail,
            PasswordHash = hashPassword(adminPassword),
            Role = UserRole.Admin,
            EmailVerified = true,
            SecurityStamp = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var profile = new UserProfile
        {
            UserId = adminId,
            FullName = "System Admin",
            UpdatedAt = DateTime.UtcNow
        };

        var identity = new AuthIdentity
        {
            Id = Guid.NewGuid(),
            UserId = adminId,
            Provider = AuthProvider.Email,
            ProviderUserId = adminEmail,
            ProviderEmail = adminEmail,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        _db.UserProfiles.Add(profile);
        _db.AuthIdentities.Add(identity);

        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin user seeded: {Email}", adminEmail);

        // Seed demo data for frontend testing
        await SeedDemoDataAsync(adminId, hashPassword);
    }

    private async Task SeedDemoDataAsync(string adminId, Func<string, string> hashPassword)
    {
        // Skip if demo data already seeded
        if (await _db.Events.IgnoreQueryFilters().AnyAsync())
        {
            _logger.LogInformation("Demo data already exists, skipping.");
            return;
        }

        var now = DateTime.UtcNow;

        // --- Users ---
        var organizerId = CreateUser("organizer@ticketstar.dev", "Org@123!", "Nguyễn Văn Tổ Chức", UserRole.User, hashPassword, isOrganizer: true);
        var staffId = CreateUser("staff@ticketstar.dev", "Staff@123!", "Trần Thị Nhân Viên", UserRole.User, hashPassword);
        var attendee1Id = CreateUser("attendee1@ticketstar.dev", "User@123!", "Lê Văn Khán Giả", UserRole.User, hashPassword);
        var attendee2Id = CreateUser("attendee2@ticketstar.dev", "User@123!", "Phạm Thị Hoa", UserRole.User, hashPassword);
        var attendee3Id = CreateUser("attendee3@ticketstar.dev", "User@123!", "Hoàng Minh Tuấn", UserRole.User, hashPassword);

        // --- Events ---
        var event1Id = Guid.NewGuid();
        var event2Id = Guid.NewGuid();
        var event3Id = Guid.NewGuid();
        var event4Id = Guid.NewGuid();

        var events = new[]
        {
            new Event
            {
                Id = event1Id, OrganizerId = organizerId, Title = "Đêm nhạc Acoustic Sài Gòn",
                Description = "Đêm nhạc acoustic với các nghệ sĩ trẻ tài năng. Không gian ấm cúng, âm nhạc chất lượng.",
                StartAt = now.AddDays(14), EndAt = now.AddDays(14).AddHours(4),
                Venue = "Nhà Văn hóa Thanh Niên, Q.1, TP.HCM", Status = EventStatus.Published,
                ImageUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
                Slug = "dem-nhac-acoustic-sai-gon", CreatedAt = now.AddDays(-10), UpdatedAt = now
            },
            new Event
            {
                Id = event2Id, OrganizerId = organizerId, Title = "Tech Conference Vietnam 2026",
                Description = "Hội nghị công nghệ lớn nhất năm với hơn 20 diễn giả từ Google, Microsoft, và các startup Việt Nam.",
                StartAt = now.AddDays(30), EndAt = now.AddDays(31),
                Venue = "Trung tâm Hội nghị GEM Center, Q.1, TP.HCM", Status = EventStatus.Published,
                ImageUrl = "https://images.unsplash.com/photo-1540575467063-178a50c9c025?w=800",
                Slug = "tech-conference-vietnam-2026", CreatedAt = now.AddDays(-20), UpdatedAt = now
            },
            new Event
            {
                Id = event3Id, OrganizerId = organizerId, Title = "Workshop Vẽ Tranh Sơn Dầu",
                Description = "Workshop vẽ tranh sơn dầu cho người mới bắt đầu. Bao gồm vật liệu và hướng dẫn từ họa sĩ chuyên nghiệp.",
                StartAt = now.AddDays(7), EndAt = now.AddDays(7).AddHours(3),
                Venue = "Art Space, 42 Nguyễn Huệ, Q.1, TP.HCM", Status = EventStatus.Published,
                ImageUrl = "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800",
                Slug = "workshop-ve-tranh-son-dau", CreatedAt = now.AddDays(-5), UpdatedAt = now
            },
            new Event
            {
                Id = event4Id, OrganizerId = organizerId, Title = "Chạy Bộ Từ Thiện 2026",
                Description = "Sự kiện chạy bộ gây quỹ từ thiện cho trẻ em vùng cao. Cự ly 5km và 10km.",
                StartAt = now.AddDays(45), EndAt = now.AddDays(45).AddHours(5),
                Venue = "Công viên Tao Đàn, Q.1, TP.HCM", Status = EventStatus.Draft,
                Slug = "chay-bo-tu-thien-2026", CreatedAt = now.AddDays(-2), UpdatedAt = now
            }
        };
        _db.Events.AddRange(events);

        // --- Ticket Types ---
        var tt1Vip = Guid.NewGuid();
        var tt1Std = Guid.NewGuid();
        var tt2Early = Guid.NewGuid();
        var tt2Std = Guid.NewGuid();
        var tt2Vip = Guid.NewGuid();
        var tt3Only = Guid.NewGuid();

        var ticketTypes = new[]
        {
            new TicketType { Id = tt1Vip, EventId = event1Id, Name = "VIP", Price = 500000, Quota = 50, SoldCount = 32, CreatedAt = now, UpdatedAt = now },
            new TicketType { Id = tt1Std, EventId = event1Id, Name = "Phổ thông", Price = 200000, Quota = 200, SoldCount = 145, CreatedAt = now, UpdatedAt = now },
            new TicketType { Id = tt2Early, EventId = event2Id, Name = "Early Bird", Price = 800000, Quota = 100, SoldCount = 100, CreatedAt = now, UpdatedAt = now },
            new TicketType { Id = tt2Std, EventId = event2Id, Name = "Standard", Price = 1200000, Quota = 300, SoldCount = 187, CreatedAt = now, UpdatedAt = now },
            new TicketType { Id = tt2Vip, EventId = event2Id, Name = "VIP + Workshop", Price = 2500000, Quota = 50, SoldCount = 28, CreatedAt = now, UpdatedAt = now },
            new TicketType { Id = tt3Only, EventId = event3Id, Name = "Tham gia", Price = 350000, Quota = 30, SoldCount = 18, CreatedAt = now, UpdatedAt = now },
        };
        _db.TicketTypes.AddRange(ticketTypes);

        // --- Event Collaborators (replaces StaffAssignment) ---
        _db.EventCollaborators.AddRange(
            new EventCollaborator
            {
                Id = Guid.NewGuid().ToString(), UserId = staffId, EventId = event1Id,
                Email = "staff@ticketstar.dev", PermissionLevel = CollaboratorPermissionLevel.Operator,
                InvitedBy = organizerId, InvitedAt = now, AcceptedAt = now, Status = CollaboratorStatus.Accepted
            },
            new EventCollaborator
            {
                Id = Guid.NewGuid().ToString(), UserId = staffId, EventId = event2Id,
                Email = "staff@ticketstar.dev", PermissionLevel = CollaboratorPermissionLevel.Operator,
                InvitedBy = organizerId, InvitedAt = now, AcceptedAt = now, Status = CollaboratorStatus.Accepted
            }
        );

        // --- Organizer Profile ---
        _db.OrganizerProfiles.Add(new OrganizerProfile
        {
            Id = Guid.NewGuid().ToString(), UserId = organizerId,
            OrganizationName = "TicketStar Events", IsComplete = true,
            CreatedAt = now
        });

        // --- Orders + OrderItems + Tickets + Payments ---
        // Attendee 1: 2 VIP tickets for event 1 (Paid)
        var order1Id = Guid.NewGuid();
        var oi1Id = Guid.NewGuid();
        CreatePaidOrder(order1Id, attendee1Id, 1000000, now.AddDays(-8), oi1Id, tt1Vip, 2, 500000, event1Id, now);

        // Attendee 1: 1 Standard ticket for event 2 (Paid)
        var order2Id = Guid.NewGuid();
        var oi2Id = Guid.NewGuid();
        CreatePaidOrder(order2Id, attendee1Id, 1200000, now.AddDays(-5), oi2Id, tt2Std, 1, 1200000, event2Id, now);

        // Attendee 2: 3 Phổ thông tickets for event 1 (Paid)
        var order3Id = Guid.NewGuid();
        var oi3Id = Guid.NewGuid();
        CreatePaidOrder(order3Id, attendee2Id, 600000, now.AddDays(-6), oi3Id, tt1Std, 3, 200000, event1Id, now);

        // Attendee 2: 1 workshop ticket for event 3 (Paid)
        var order4Id = Guid.NewGuid();
        var oi4Id = Guid.NewGuid();
        CreatePaidOrder(order4Id, attendee2Id, 350000, now.AddDays(-3), oi4Id, tt3Only, 1, 350000, event3Id, now);

        // Attendee 3: 2 VIP+Workshop for event 2 (Paid)
        var order5Id = Guid.NewGuid();
        var oi5Id = Guid.NewGuid();
        CreatePaidOrder(order5Id, attendee3Id, 5000000, now.AddDays(-4), oi5Id, tt2Vip, 2, 2500000, event2Id, now);

        // Attendee 3: cancelled order
        _db.Orders.Add(new Order
        {
            Id = Guid.NewGuid(), UserId = attendee3Id, Status = OrderStatus.Cancelled,
            TotalAmount = 200000, CreatedAt = now.AddDays(-7), UpdatedAt = now.AddDays(-7)
        });

        // Attendee 1: pending order for event 3
        _db.Orders.Add(new Order
        {
            Id = Guid.NewGuid(), UserId = attendee1Id, Status = OrderStatus.Pending,
            TotalAmount = 350000, ExpiresAt = now.AddMinutes(15), CreatedAt = now, UpdatedAt = now
        });

        // --- CheckIns (some tickets checked in for event 1) ---
        // Get the first 2 tickets of attendee1's VIP order and check them in
        var tickets1 = _db.Tickets.Local.Where(t => t.OrderItemId == oi1Id).Take(2).ToList();
        foreach (var ticket in tickets1)
        {
            ticket.IsCheckedIn = true;
            _db.CheckIns.Add(new CheckIn
            {
                Id = Guid.NewGuid(), TicketId = ticket.Id, EventId = event1Id,
                ScannedBy = staffId, ScannedAt = now.AddHours(-1)
            });
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Demo data seeded: 4 events, 6 ticket types, 7 orders, 5 users");
    }

    private string CreateUser(string email, string password, string fullName, UserRole role, Func<string, string> hashPassword, bool isOrganizer = false)
    {
        var userId = Guid.NewGuid().ToString();
        _db.Users.Add(new User
        {
            Id = userId, Email = email, PasswordHash = hashPassword(password),
            Role = role, IsOrganizer = isOrganizer, EmailVerified = true,
            SecurityStamp = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        _db.UserProfiles.Add(new UserProfile { UserId = userId, FullName = fullName, UpdatedAt = DateTime.UtcNow });
        _db.AuthIdentities.Add(new AuthIdentity
        {
            Id = Guid.NewGuid(), UserId = userId, Provider = AuthProvider.Email,
            ProviderUserId = email, ProviderEmail = email, CreatedAt = DateTime.UtcNow
        });
        return userId;
    }

    private void CreatePaidOrder(Guid orderId, string userId, decimal total, DateTime createdAt,
        Guid orderItemId, Guid ticketTypeId, int qty, decimal unitPrice, Guid eventId, DateTime now)
    {
        _db.Orders.Add(new Order
        {
            Id = orderId, UserId = userId, Status = OrderStatus.Paid,
            TotalAmount = total, PaidAt = createdAt.AddMinutes(2),
            CreatedAt = createdAt, UpdatedAt = createdAt
        });
        _db.OrderItems.Add(new OrderItem
        {
            Id = orderItemId, OrderId = orderId, TicketTypeId = ticketTypeId,
            Quantity = qty, UnitPrice = unitPrice, CreatedAt = createdAt
        });
        _db.Payments.Add(new Payment
        {
            Id = Guid.NewGuid(), OrderId = orderId, Provider = "SePay",
            ExternalRef = $"SEPAY-{orderId.ToString()[..8].ToUpper()}",
            Amount = total, Status = PaymentStatus.Success,
            CreatedAt = createdAt, ProcessedAt = createdAt.AddMinutes(2), UpdatedAt = createdAt
        });

        // Create tickets
        for (var i = 0; i < qty; i++)
        {
            var ticketId = Guid.NewGuid();
            _db.Tickets.Add(new Ticket
            {
                Id = ticketId, OrderItemId = orderItemId, UserId = userId,
                EventId = eventId, TicketTypeId = ticketTypeId,
                QrCode = $"{ticketId}|{eventId}|{userId}|{now:yyyyMMddHHmmss}|seed-hmac",
                IsCheckedIn = false, CreatedAt = createdAt
            });
        }
    }
}
