# TicketStar Development Commands (Windows)
# Requires: PowerShell, Docker, dotnet, pnpm

API_DIR := backend/src/TicketStar.API
INFRA_DIR := backend/src/TicketStar.Infrastructure
FRONTEND_DIR := frontend

DOTNET_EF := dotnet ef

.PHONY: default dev stop-infra infra stop down infra-down backend frontend \
        build-backend build-frontend build test test-v lint migrate migration \
        migrate-list db-reset swagger health clean install logs db redis restore

# List available commands
default:
	@powershell -NoProfile -Command "Select-String -Path Makefile -Pattern '^[a-zA-Z_-]+:' | ForEach-Object { $_.Line.Split(':')[0] }"

# Start backend and frontend concurrently
dev: stop-infra
	powershell -NoProfile -Command "\
		$$b = Start-Process -NoNewWindow -PassThru powershell '-NoProfile -Command cd $(API_DIR); dotnet watch run'; \
		$$f = Start-Process -NoNewWindow -PassThru powershell '-NoProfile -Command cd $(FRONTEND_DIR); pnpm dev'; \
		try { Wait-Process -Id $$b.Id,$$f.Id } \
		finally { Stop-Process -Id $$b.Id,$$f.Id -Force -ErrorAction SilentlyContinue }"

# Kill processes on dev ports (no Docker)
stop-infra:
	powershell -NoProfile -Command "\
		@(5010,3001) | ForEach-Object { \
			Get-NetTCPConnection -LocalPort $$_ -ErrorAction SilentlyContinue \
				| Select-Object -ExpandProperty OwningProcess -Unique \
				| ForEach-Object { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue } \
		}; \
		Get-WmiObject Win32_Process \
			| Where-Object { $$_.CommandLine -match 'next.*dev|dotnet watch run' } \
			| ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"

# Start Docker infrastructure (MySQL, Redis, RabbitMQ)
infra:
	docker compose up -d
	powershell -NoProfile -Command "Write-Host 'Waiting for services...'; Start-Sleep 3"

# Stop all dev processes
stop:
	powershell -NoProfile -Command "\
		Write-Host 'Stopping all dev processes...'; \
		@(5010,3001) | ForEach-Object { \
			Get-NetTCPConnection -LocalPort $$_ -ErrorAction SilentlyContinue \
				| Select-Object -ExpandProperty OwningProcess -Unique \
				| ForEach-Object { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue } \
		}; \
		Get-WmiObject Win32_Process \
			| Where-Object { $$_.CommandLine -match 'next.*dev|dotnet watch run' } \
			| ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }; \
		Write-Host 'All dev processes stopped'"

# Stop all dev processes and Docker
down: stop infra-down

# Stop Docker infrastructure only
infra-down:
	docker compose down

# Run backend API (port 5010)
backend:
	cd $(API_DIR) && dotnet watch run

# Run frontend dev server (port 3001)
frontend:
	cd $(FRONTEND_DIR) && pnpm dev

# Build backend
build-backend:
	cd $(API_DIR) && dotnet build

# Build frontend
build-frontend:
	cd $(FRONTEND_DIR) && pnpm build

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
	cd $(FRONTEND_DIR) && pnpm lint

# Apply EF Core migrations
migrate:
	$(DOTNET_EF) database update --project $(INFRA_DIR) --startup-project $(API_DIR)

# Create a new EF Core migration — usage: make migration name=MigrationName
migration:
	$(DOTNET_EF) migrations add $(name) --project $(INFRA_DIR) --startup-project $(API_DIR)

# List EF Core migrations
migrate-list:
	$(DOTNET_EF) migrations list --project $(INFRA_DIR) --startup-project $(API_DIR)

# Drop and recreate database + apply migrations
db-reset:
	$(DOTNET_EF) database drop --force --project $(INFRA_DIR) --startup-project $(API_DIR)
	$(MAKE) migrate

# Open Swagger UI
swagger:
	powershell -NoProfile -Command "Start-Process 'http://localhost:5010/swagger'"

# Check health endpoints
health:
	powershell -NoProfile -Command "\
		try { Invoke-WebRequest -Uri http://localhost:5010/health/live -UseBasicParsing -EA Stop | Out-Null; Write-Host 'v live' } \
		catch { Write-Host 'x live (API not running)' }; \
		try { Invoke-WebRequest -Uri http://localhost:5010/health/ready -UseBasicParsing -EA Stop | Out-Null; Write-Host 'v ready' } \
		catch { Write-Host 'x ready (API not running)' }"

# Clean build artifacts
clean:
	cd backend && dotnet clean
	powershell -NoProfile -Command "\
		if (Test-Path $(FRONTEND_DIR)/.next) { Remove-Item -Recurse -Force $(FRONTEND_DIR)/.next }; \
		if (Test-Path $(FRONTEND_DIR)/node_modules/.cache) { Remove-Item -Recurse -Force $(FRONTEND_DIR)/node_modules/.cache }"

# Install frontend dependencies
install:
	cd $(FRONTEND_DIR) && pnpm install

# View backend logs info
logs:
	@echo Backend logs are printed to stdout when running 'make backend'

# Connect to MySQL CLI
db:
	docker exec -it ticketstar-mysql mysql -u root -p%MYSQL_ROOT_PASSWORD% %MYSQL_DATABASE%

# Connect to Redis CLI
redis:
	docker exec -it ticketstar-redis redis-cli -a %REDIS_PASSWORD%

# Restore backend packages
restore:
	cd backend && dotnet restore
