# TicketStar - Deployment Guide

## Prerequisites

### Required Software
- **.NET 8 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm** - `npm install -g pnpm`
- **Docker & Docker Compose** - [Download](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/)

### Optional (for development)
- **MySQL Client** - For direct database access
- **Redis CLI** - For cache inspection

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd ticketstar
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Default values work for local development
```

### 3. Start Infrastructure Services

```bash
# Start MySQL, Redis, RabbitMQ
docker-compose up -d

# Verify services are healthy
docker-compose ps
```

### 4. Backend Setup

```bash
cd backend

# Restore NuGet packages
dotnet restore

# Build solution
dotnet build

# Run API (development)
dotnet run --project src/TicketStar.API
```

Backend will run on `http://localhost:5010`

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Frontend will run on `http://localhost:3001`

---

## Development Workflow

### Running All Services

```bash
# Terminal 1: Infrastructure
docker-compose up

# Terminal 2: Backend
cd backend && dotnet run --project src/TicketStar.API

# Terminal 3: Frontend
cd frontend && pnpm dev
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3001 | - |
| Backend API | http://localhost:5010 | - |
| API Swagger | http://localhost:5010/swagger | - |
| RabbitMQ Management | http://localhost:15672 | guest/guest |
| MySQL | localhost:3307 | root/.env password |
| Redis | localhost:6380 | .env password |

---

## Database Management

### Running Migrations

```bash
cd backend/src/TicketStar.Infrastructure

# Create migration
dotnet ef migrations add <MigrationName> --startup-project ../TicketStar.API

# Apply migrations
dotnet ef database update --startup-project ../TicketStar.API
```

### Seeding Data

Initial seed data (roles, admin user) runs on startup via `Program.cs`.

### Direct Database Access

```bash
# Connect via MySQL client
mysql -h 127.0.0.1 -P 3307 -u root -p

# Or use Docker exec
docker exec -it ticketstar-mysql mysql -u root -p
```

---

## Docker Services

### Service Status

```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f mysql
docker-compose logs -f redis
docker-compose logs -f rabbitmq
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart mysql
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears data!)
docker-compose down -v
```

---

## Building for Production

### Backend

```bash
cd backend

# Release build
dotnet build -c Release

# Publish for runtime
dotnet publish src/TicketStar.API -c Release -o ./publish
```

### Frontend

```bash
cd frontend

# Production build
pnpm build

# Output in .next/ directory
# Start production server
pnpm start
```

---

## Environment Variables

### Required Variables

```bash
# .env file
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=ticketstar
REDIS_PASSWORD=your_redis_password
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
JWT_SECRET=your_jwt_secret_min_256_bits
NEXT_PUBLIC_API_URL=http://localhost:5010
```

### Backend Configuration (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3307;Database=ticketstar;User=root;Password=your_password;"
  },
  "Redis": {
    "ConnectionString": "localhost:6380,password=your_redis_password"
  },
  "RabbitMQ": {
    "Host": "localhost",
    "Port": 5672,
    "UserName": "guest",
    "Password": "guest"
  },
  "Jwt": {
    "Secret": "your_jwt_secret",
    "ExpiryMinutes": 15,
    "RefreshExpiryDays": 7
  },
  "Google": {
    "ClientId": "your_google_client_id"
  }
}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001  # Frontend
lsof -i :5010  # Backend
lsof -i :3307  # MySQL

# Kill process
kill -9 <PID>
```

### Docker Issues

```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Failed

1. Verify MySQL is running: `docker-compose ps mysql`
2. Check credentials in `.env`
3. Test connection: `mysql -h 127.0.0.1 -P 3307 -u root -p`

### Migration Errors

```bash
# Force reset (WARNING: deletes all data)
cd backend/src/TicketStar.API
dotnet ef database drop --force
dotnet ef database update
```

---

## Security Notes for Production

### Before Deploying

- [ ] Change all default passwords
- [ ] Generate strong JWT secret (min 256 bits)
- [ ] Set up Google OAuth in Google Cloud Console
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS
- [ ] Set up proper logging (Serilog, Seq, etc.)
- [ ] Configure production Redis password
- [ ] Set up database backups
- [ ] Review and update rate limiting settings
- [ ] Set up monitoring (Application Insights, Prometheus, etc.)

### Environment-Specific Config

Use `appsettings.Production.json` for production overrides:

```json
{
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Production_Connection_String"
  },
  "Jwt": {
    "Secret": "Production_Secret_From_Vault"
  }
}
```

---

## Monitoring & Logs

### Backend Logs

```bash
# Development console
dotnet run --project src/TicketStar.API

# Structured logging
# Check appsettings.json for Log levels
```

### Frontend Logs

```bash
# Next.js dev server logs
pnpm dev

# Browser console for client-side errors
```

### Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ticketstar-mysql
```

---

**Last Updated:** 2026-02-26
**Phase:** 1 Complete - Deployment Guide Created
