# TicketStar Development Commands
# Install just: https://github.com/casey/just

set dotenv-load
set shell := ["sh", "-cu"]

api_dir := "backend/src/TicketStar.API"
infra_dir := "backend/src/TicketStar.Infrastructure"
frontend_dir := "frontend"

# Default: list available commands
default:
    @just --list

# Full startup: infra + migrate + backend + frontend
start: stop-infra
    #!/bin/sh
    echo "==> Starting Docker infrastructure..."
    docker compose up -d
    echo "==> Waiting for services to be ready..."
    sleep 5
    echo "==> Running database migrations..."
    dotnet ef database update --project {{infra_dir}} --startup-project {{api_dir}}
    echo "==> Starting backend and frontend..."
    trap 'just stop' EXIT INT TERM
    just backend &
    just frontend &
    wait

# Start everything (infra + backend + frontend)
dev: stop-infra
    #!/bin/sh
    echo "Starting backend and frontend..."
    trap 'just stop' EXIT INT TERM
    just backend &
    just frontend &
    wait

# Stop only dev processes (not Docker infra)
stop-infra:
    #!/bin/sh
    echo "Cleaning up ports 3001 and 5010..."
    lsof -ti :5010 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    lsof -ti :3001 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "dotnet watch run" 2>/dev/null || true

# Start Docker infrastructure (MySQL, Redis, RabbitMQ)
infra:
    docker compose up -d
    @echo "Waiting for services to be healthy..."
    @sleep 3

# Stop all dev processes (backend on 5010, frontend on 3001)
stop:
    #!/bin/sh
    echo "Stopping all dev processes..."
    lsof -ti :5010 | xargs -r kill -9 2>/dev/null || true
    lsof -ti :3001 | xargs -r kill -9 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "dotnet watch run" 2>/dev/null || true
    echo "All dev processes stopped"

# Stop all dev processes and Docker infrastructure
down: stop infra-down
# Stop Docker infrastructure only
infra-down:
    docker compose down

# Run backend API (port 5010)
backend:
    #!/bin/sh
    lsof -ti :5010 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    cd {{api_dir}} && dotnet watch run

# Run frontend dev server (port 3001)
frontend:
    #!/bin/sh
    lsof -ti :3001 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    cd {{frontend_dir}} && pnpm dev

# Build backend
build-backend:
    cd {{api_dir}} && dotnet build

# Build frontend
build-frontend:
    cd {{frontend_dir}} && pnpm build

# Build both
build: build-backend build-frontend

# Run backend tests
test:
    cd backend && dotnet test

# Run backend tests with verbose output
test-v:
    cd backend && dotnet test --verbosity normal

# Lint frontend
lint:
    cd {{frontend_dir}} && pnpm lint

# Apply EF Core migrations
migrate:
    dotnet ef database update --project {{infra_dir}} --startup-project {{api_dir}}

# Create a new EF Core migration
migration name:
    dotnet ef migrations add {{name}} --project {{infra_dir}} --startup-project {{api_dir}}

migrate-list:
    dotnet ef migrations list --project {{infra_dir}} --startup-project {{api_dir}}

# Drop and recreate database + apply migrations
db-reset:
    dotnet ef database drop --force --project {{infra_dir}} --startup-project {{api_dir}}
    just migrate

# Open Swagger UI
swagger:
    xdg-open http://localhost:5010/swagger 2>/dev/null || open http://localhost:5010/swagger

# Check health endpoints
health:
    @curl -sf http://localhost:5010/health/live && echo " ✓ live" || echo "✗ live (API not running)"
    @curl -sf http://localhost:5010/health/ready && echo " ✓ ready" || echo "✗ ready (API not running)"

# Clean build artifacts
clean:
    cd backend && dotnet clean
    rm -rf {{frontend_dir}}/.next {{frontend_dir}}/node_modules/.cache

# Install frontend dependencies
install:
    cd {{frontend_dir}} && pnpm install

# View backend logs (when running via dotnet run)
logs:
    @echo "Backend logs are printed to stdout when running 'just backend'"

# Connect to MySQL CLI
db:
    docker exec -it ticketstar-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE

# Connect to Redis CLI
redis:
    docker exec -it ticketstar-redis redis-cli -a $REDIS_PASSWORD

# Restore backend packages
restore:
    cd backend && dotnet restore
