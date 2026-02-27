# TicketStar - Project Changelog

All notable changes to the TicketStar project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Backend API endpoints (Phase 3)
- Frontend authentication & layout (Phase 4)
- Marketplace functionality (Phase 5)

---

## [0.2.0] - 2026-02-27

### Added - Phase 2: Database & Identity (Auth Migration)

#### Database Schema
- Implemented custom authentication schema without ASP.NET Identity
- Created 9 core entities:
  - `User` - Primary identity with email/phone
  - `UserProfile` - Extended attributes (name, avatar, etc.)
  - `AuthIdentity` - OAuth provider accounts (Google, Apple, etc.)
  - `AuthSession` - Active session tracking
  - `SecurityEvent` - Audit trail for auth actions
  - `WebAuthnCredential` - Multi-factor authentication support
  - `MagicLink` - Passwordless authentication tokens
  - `RefreshToken` - Token rotation tracking
  - `EmailChangeRequest` - Pending email verification

#### Entity Framework Core
- Implemented plain `AppDbContext` (no Identity framework)
- Created entity configuration builders for all entities
- Configured relationships with cascade delete rules
- Added database indexes on auth lookup fields
- Initial migration: `20260227_InitialAuth`

#### Security Services
- **Argon2PasswordHasher**
  - OWASP 2025 compliant parameters (t=3, m=64MB, p=4)
  - Secure salt generation per password
  - Constant-time verification
  - Unicode/UTF-8 support
  - Special character handling

- **Sha256TokenHasher**
  - Deterministic SHA-256 hashing
  - Constant-time comparison (timing attack prevention)
  - Lowercase hex output
  - Case-sensitive token matching

- **CryptoRandomService**
  - Cryptographically secure RNG (CSPRNG)
  - URL-safe Base64 token generation (no padding)
  - Configurable byte length
  - GUID generation without hyphens
  - Thread-safe implementation

#### Authentication Services
- **AuthService**
  - User registration with email validation
  - Google OAuth integration
  - Apple OAuth support
  - Magic link generation & verification
  - Account lockout (5 failed attempts)
  - Email verification workflow
  - Security event logging

- **TokenService**
  - JWT access token generation (15 min expiry)
  - Refresh token generation (7 day expiry)
  - Token refresh with rotation
  - Reuse detection for security
  - Token validation & claims extraction

- **SessionService**
  - Session creation & tracking
  - Session validation
  - Logout with revocation
  - Revoke all sessions
  - Session timeout enforcement

#### API Endpoints
- POST `/auth/register` - User registration
- POST `/auth/login-email` - Email/password authentication
- POST `/auth/google` - Google OAuth flow
- POST `/auth/apple` - Apple OAuth flow
- POST `/auth/magic-link/request` - Request magic link
- POST `/auth/magic-link/verify` - Verify magic link token
- POST `/auth/refresh` - Refresh access token with rotation
- POST `/auth/logout` - Logout & revoke session

#### API Configuration
- JWT authentication middleware
- Bearer token validation
- Rate limiting on magic link endpoint
- CORS policy
- Role-based authorization
- Dependency injection container setup

#### Data Seeding
- 4 roles seeded (Admin, Organizer, Staff, Attendee)
- Admin user seeded for testing

#### Testing
- 35 unit tests (100% passing)
  - 9 Argon2PasswordHasher tests
  - 13 Sha256TokenHasher tests
  - 13 CryptoRandomService tests
  - 1 TokenService integration test
- Comprehensive security validations
- Test execution time: 6.6 seconds
- Build: 0 errors, 0 critical warnings

---

## [0.1.0] - 2026-02-26

### Added - Phase 1: Project Scaffolding

#### Backend (.NET 8)
- Created .NET 8 solution file `TicketStar.sln`
- Implemented 4-layer architecture:
  - `TicketStar.API` - ASP.NET Core Web API project
  - `TicketStar.Application` - Business logic layer
  - `TicketStar.Domain` - Core entities & interfaces
  - `TicketStar.Infrastructure` - Data access & external services
- Added test project `TicketStar.Tests`
- Configured NuGet package dependencies

#### Frontend (Next.js 15)
- Initialized Next.js 15.16 project with App Router
- Configured TypeScript 5
- Set up Tailwind CSS 4
- Installed and configured shadcn/ui components
- Added React 19.2.3 and React DOM 19.2.3
- Configured TanStack React Query (v5.90.21) for data fetching
- Created project structure:
  - `app/` - App Router pages directory
  - `components/` - React components (including shadcn/ui)
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions
  - `types/` - TypeScript type definitions
- Added essential dependencies:
  - `@hookform/resolvers` - Form validation
  - `react-hook-form` - Form management
  - `zod` - Schema validation
  - `jwt-decode` - JWT parsing
  - `@zxing/library` - QR code reading
  - `react-qr-code` - QR code generation
  - `sonner` - Toast notifications
  - `lucide-react` - Icon library

#### Infrastructure (Docker)
- Created `docker-compose.yml` with services:
  - **MySQL 8.0** (port 3307)
    - Database: `ticketstar`
    - Health check configured
    - Persistent volume: `mysql-data`
  - **Redis 7-Alpine** (port 6380)
    - Password protection via environment variable
    - Health check configured
  - **RabbitMQ 3-Management** (ports 5672, 15672)
    - Management UI available at http://localhost:15672
    - Health check configured

#### Configuration
- Created `.env.example` template with:
  - MySQL credentials
  - Redis password
  - RabbitMQ credentials
  - JWT secret
  - Frontend API URL
- Created `.gitignore` for:
  - `.env` files
  - `node_modules/`
  - `.next/`
  - `bin/`, `obj/` (.NET)
  - OS-specific files
- Initialized Git repository
- Configured port mappings:
  - Frontend: `3001`
  - Backend: `5010`
  - MySQL: `3307`
  - Redis: `6380`
  - RabbitMQ: `5672` (AMQP), `15672` (Management UI)

#### Documentation
- Created `docs/` directory structure
- Added `docs/project-overview-pdr.md` - Project overview and PDR
- Added `docs/system-architecture.md` - System architecture documentation
- Added `docs/code-standards.md` - Coding conventions and standards
- Added `docs/development-roadmap.md` - Development phases and milestones
- Added `docs/project-changelog.md` - This file

#### Build Configuration
- Backend: `dotnet build` passes successfully
- Frontend: `pnpm build` passes successfully
- All services start via `docker-compose up`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.2.0 | 2026-02-27 | Auth system & database implementation |
| 0.1.0 | 2026-02-26 | Initial project scaffolding |

---

**Last Updated:** 2026-02-27
