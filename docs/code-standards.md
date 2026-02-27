# TicketStar - Code Standards

## File Naming Conventions

### General Rules
- Use **kebab-case** for all file names
- Use **descriptive, self-documenting names** (long names are acceptable)
- Goal: File purpose should be clear from name alone (for LLM tools like Grep/Glob)

### By Language/Type

| Type | Convention | Examples |
|------|------------|----------|
| **C#** | PascalCase | `EventController.cs`, `TicketService.cs`, `IEventRepository.cs` |
| **TypeScript** | kebab-case | `event-card.tsx`, `use-auth.ts`, `api-client.ts` |
| **Python** | snake_case | `event_processor.py`, `auth_helper.py` |
| **Shell** | kebab-case | `deploy-script.sh`, `setup-db.sh` |
| **Markdown** | kebab-case | `api-endpoints.md`, `deployment-guide.md` |

## File Size Management

### Maximum LOC Limits
- **Code files**: Keep under **200 lines** (preferred: 100-150 lines)
- **Markdown files**: Keep under **800 lines** (split if exceeded)

### When to Split Files
1. **Single file approaching limit** → Stop and split into modules
2. **New large feature** → Create dedicated module from start
3. **Large Markdown** → Create topic directory with index + part files

### Modularization Guidelines
- Check existing modules before creating new
- Analyze logical separation boundaries
- Extract utilities into separate modules
- Use composition over inheritance

## Code Organization

### Backend (.NET 8)

```
src/TicketStar.API/
├── Controllers/
│   ├── EventsController.cs          # Event endpoints
│   ├── TicketsController.cs         # Ticket endpoints
│   └── AuthController.cs            # Auth endpoints
├── Middleware/
│   ├── ExceptionHandlerMiddleware.cs
│   └── RateLimitingMiddleware.cs
├── Filters/
│   └── ValidationFilter.cs
└── Program.cs                       # App configuration

src/TicketStar.Application/
├── Services/
│   ├── EventService.cs              # Event business logic
│   ├── TicketService.cs             # Ticket business logic
│   └── AuthService.cs               # Auth business logic
├── DTOs/
│   ├── EventDto.cs
│   └── TicketDto.cs
├── Mappings/
│   └── MappingProfile.cs            # DTO ↔ Entity mappings
└── Validation/
    └── Validators.cs                # FluentValidation/DataAnnotations

src/TicketStar.Domain/
├── Entities/
│   ├── Event.cs                     # Domain entities
│   ├── Ticket.cs
│   └── User.cs
├── ValueObjects/
│   └── Money.cs                     # Immutable value types
├── Interfaces/
│   ├── IEventRepository.cs          # Repository contracts
│   └── IEventService.cs             # Service contracts
└── Enums/
    └── UserRole.cs                  # User roles

src/TicketStar.Infrastructure/
├── Data/
│   └── AppDbContext.cs              # EF Core context
├── Repositories/
│   └── EventRepository.cs           # Repository implementations
├── Cache/
│   └── RedisCacheService.cs         # Redis wrapper
├── Messaging/
│   └── MessageBusService.cs         # RabbitMQ/MassTransit
└── ExternalServices/
    ├── SePayService.cs              # Payment integration
    └── GoogleAuthService.cs         # OAuth integration
```

### Frontend (Next.js 15)

```
app/
├── (auth)/
│   ├── login/page.tsx               # Login page
│   └── magic-link/page.tsx          # Magic link page
├── (dashboard)/
│   ├── organizer/
│   │   ├── events/page.tsx          # Event list
│   │   └── events/[id]/page.tsx     # Event details
│   ├── staff/
│   │   └── check-in/page.tsx        # Check-in interface
│   └── admin/
│       └── users/page.tsx           # User management
├── (marketplace)/
│   ├── page.tsx                     # Home/marketplace
│   └── events/[id]/page.tsx         # Event details
└── api/
    └── auth/
        └── [...nextauth]/route.ts   # NextAuth API proxy

components/
├── ui/                              # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   └── dialog.tsx
├── auth/
│   ├── login-form.tsx
│   └── magic-link-form.tsx
├── events/
│   ├── event-card.tsx
│   └── event-list.tsx
├── tickets/
│   ├── ticket-card.tsx
│   └── ticket-qr.tsx
└── checkout/
    └── checkout-flow.tsx

hooks/
├── use-auth.ts                      # Auth state hook
├── use-events.ts                    # Event data hook
└── use-tickets.ts                   # Ticket data hook

lib/
├── api.ts                           # API client (fetch wrapper)
├── query.ts                         # React Query setup
├── utils.ts                         # Helper functions (cn, etc.)
└── constants.ts                     # App constants

types/
├── event.ts                         # Event types
├── ticket.ts                        # Ticket types
└── user.ts                          # User types
```

## Coding Conventions

### C# Standards

```csharp
// Naming: PascalCase for classes, methods, properties
public class EventService
{
    private readonly IEventRepository _repository;

    public async Task<EventDto> GetEventAsync(Guid id)
    {
        var @event = await _repository.GetByIdAsync(id);
        return MapToDto(@event);
    }
}

// Interfaces: Prefix with 'I'
public interface IEventRepository
{
    Task<Event> GetByIdAsync(Guid id);
}

// Async: Always suffix with 'Async'
public Task<Event> GetByIdAsync(Guid id);

// Private fields: _camelCase
private readonly IEventRepository _eventRepository;

// Constants: PascalCase
public const int MaxTicketsPerUser = 10;
```

### TypeScript Standards

```typescript
// File: event-card.tsx

// Components: PascalCase, export default
export default function EventCard({ event }: EventCardProps) {
  return <div>{event.name}</div>;
}

// Hooks: camelCase with 'use' prefix
export function useEvent(id: string) {
  return useQuery({ queryKey: ['event', id] });
}

// Types: PascalCase for interfaces/types
export interface Event {
  id: string;
  name: string;
}

// Functions: camelCase
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// Constants: UPPER_SNAKE_CASE
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;
```

## Git Conventions

### Commit Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no functional change)
- `test`: Adding/updating tests
- `chore`: Build/config/dependency changes

### Examples
```bash
feat(auth): implement Google OAuth login flow
fix(tickets): resolve race condition in ticket quota enforcement
docs(api): update authentication endpoint documentation
refactor(events): extract event validation to separate service
test(booking): add integration tests for checkout flow
chore(deps): upgrade Next.js to 15.16
```

## Error Handling Standards

### Backend (.NET)
```csharp
// Services: Return Result pattern or throw domain exceptions
public async Task<Result<Ticket>> PurchaseTicketAsync(...)
{
    if (event.IsSoldOut)
        return Result.Failure("Event is sold out");

    try
    {
        var ticket = await _repository.CreateAsync(...);
        return Result.Success(ticket);
    }
    catch (DbUpdateException ex)
    {
        _logger.LogError(ex, "Failed to create ticket");
        throw new ApplicationError("Failed to purchase ticket");
    }
}

// Controllers: Use exception filter
[HttpPost]
public async Task<IActionResult> PurchaseTicket(...)
{
    var result = await _service.PurchaseTicketAsync(...);
    return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
}
```

### Frontend (TypeScript)
```typescript
// API client: Standardized error handling
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new NetworkError("Failed to connect to server");
  }
}

// Components: Display user-friendly errors
const { data, error, isLoading } = useEvent(eventId);

if (error) {
  return <ErrorAlert message={error.userMessage} />;
}
```

## Testing Standards

### Backend Tests
```csharp
// Naming: MethodName_StateUnderTest_ExpectedBehavior
[Fact]
public async Task PurchaseTicket_WhenEventSoldOut_ReturnsFailure()
{
    // Arrange
    var @event = CreateSoldOutEvent();
    _repository.Setup(x => x.GetByIdAsync(It.IsAny<Guid>()))
        .ReturnsAsync(@event);

    // Act
    var result = await _service.PurchaseTicketAsync(...);

    // Assert
    Assert.False(result.IsSuccess);
    Assert.Contains("sold out", result.Error);
}
```

### Frontend Tests
```typescript
// Component tests: user-centric
describe('EventCard', () => {
  it('displays event name and price', () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText(mockEvent.name)).toBeInTheDocument();
    expect(screen.getByText(formatPrice(mockEvent.price))).toBeInTheDocument();
  });

  it('navigates to event page on click', async () => {
    render(<EventCard event={mockEvent} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockRouter.push).toHaveBeenCalledWith(`/events/${mockEvent.id}`);
  });
});
```

## Documentation Standards

### Code Comments
```csharp
// XML docs for public APIs
/// <summary>
/// Purchases a ticket for the specified event
/// </summary>
/// <param name="eventId">Event identifier</param>
/// <param name="userId">User identifier</param>
/// <returns>Result containing ticket or error</returns>
public async Task<Result<Ticket>> PurchaseTicketAsync(Guid eventId, Guid userId)
```

```typescript
/**
 * Fetches an event by ID
 * @param id - Event UUID
 * @returns Promise resolving to Event data
 * @throws ApiError if event not found
 */
export async function getEvent(id: string): Promise<Event>
```

### README Standards
Each major directory should have a README.md explaining:
- Purpose of the module
- Key components/files
- Usage examples
- Dependencies on other modules

## Security Standards

### Passwords & Secrets
- Never commit `.env` files
- Use `.env.example` for template
- Rotate secrets before production
- Hash passwords with ASP.NET Core Identity

### API Security
- Validate all inputs (DataAnnotations)
- Use parameterized queries (EF Core)
- Implement rate limiting
- Validate JWT on every request
- Use httpOnly cookies for auth tokens

### Frontend Security
- Never store tokens in localStorage
- Validate data on server side
- Sanitize user input (React default)
- Use CSP headers in production

---

**Last Updated:** 2026-02-26
**Version:** 1.0.0
