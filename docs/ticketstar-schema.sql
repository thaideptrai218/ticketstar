-- ============================================================
-- TicketStar Database Schema
-- MySQL 8.0
-- Generated: 2026-03-21
-- ============================================================

DROP DATABASE IF EXISTS ticketstar;
CREATE DATABASE ticketstar
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ticketstar;

-- ─────────────────────────────────────────────
-- AUTH & USER TABLES
-- ─────────────────────────────────────────────

CREATE TABLE Users (
    Id               VARCHAR(36)  NOT NULL PRIMARY KEY,
    Email            VARCHAR(255) NOT NULL UNIQUE,
    EmailVerified    BOOLEAN      NOT NULL DEFAULT FALSE,
    PasswordHash     VARCHAR(512),
    Role             VARCHAR(50)  NOT NULL DEFAULT 'Attendee',
    IsOrganizer      BOOLEAN      NOT NULL DEFAULT FALSE,
    MfaEnabled       BOOLEAN      NOT NULL DEFAULT FALSE,
    FailedLoginCount INT          NOT NULL DEFAULT 0,
    LockedUntil      DATETIME,
    CreatedAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    DeletedAt        DATETIME
);

CREATE TABLE UserProfile (
    UserId        VARCHAR(36)  NOT NULL PRIMARY KEY,
    FullName      VARCHAR(255),
    AvatarUrl     VARCHAR(1024),
    Phone         VARCHAR(20),
    PhoneVerified BOOLEAN      NOT NULL DEFAULT FALSE,
    Bio           TEXT,
    UpdatedAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_userprofile_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE OrganizerProfile (
    Id               VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId           VARCHAR(36)  NOT NULL UNIQUE,
    OrganizationName VARCHAR(255) NOT NULL,
    Description      TEXT,
    LogoUrl          VARCHAR(1024),
    Phone            VARCHAR(20),
    Address          VARCHAR(500),
    Website          VARCHAR(1024),
    FacebookUrl      VARCHAR(1024),
    InstagramUrl     VARCHAR(1024),
    IsComplete       BOOLEAN      NOT NULL DEFAULT FALSE,
    CreatedAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orgprofile_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE AuthIdentity (
    Id             VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId         VARCHAR(36)  NOT NULL,
    Provider       VARCHAR(50)  NOT NULL,
    ProviderUserId VARCHAR(255) NOT NULL,
    CreatedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_authidentity_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    UNIQUE KEY uq_authidentity_provider (Provider, ProviderUserId)
);

CREATE TABLE RefreshToken (
    Id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId     VARCHAR(36)  NOT NULL,
    TokenHash  VARCHAR(512) NOT NULL,
    DeviceInfo VARCHAR(255),
    IpAddress  VARCHAR(45),
    IsRevoked  BOOLEAN      NOT NULL DEFAULT FALSE,
    ExpiresAt  DATETIME     NOT NULL,
    CreatedAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refreshtoken_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE MagicLink (
    Id        VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId    VARCHAR(36)  NOT NULL,
    TokenHash VARCHAR(512) NOT NULL,
    IsUsed    BOOLEAN      NOT NULL DEFAULT FALSE,
    ExpiresAt DATETIME     NOT NULL,
    CreatedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_magiclink_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE AuthSession (
    Id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId     VARCHAR(36)  NOT NULL,
    Device     VARCHAR(255),
    IpAddress  VARCHAR(45),
    UserAgent  VARCHAR(512),
    LastUsedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt  DATETIME     NOT NULL,
    CreatedAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_authsession_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE SecurityEvent (
    Id        VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId    VARCHAR(36)  NOT NULL,
    EventType VARCHAR(100) NOT NULL,
    IpAddress VARCHAR(45),
    Details   TEXT,
    CreatedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_securityevent_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE MfaRecoveryCodes (
    Id        VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId    VARCHAR(36)  NOT NULL,
    CodeHash  VARCHAR(512) NOT NULL,
    IsUsed    BOOLEAN      NOT NULL DEFAULT FALSE,
    UsedAt    DATETIME,
    CreatedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mfarecovery_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- EVENT TABLES
-- ─────────────────────────────────────────────

CREATE TABLE Events (
    Id                 CHAR(36)      NOT NULL PRIMARY KEY,
    OrganizerId        VARCHAR(36)   NOT NULL,
    Title              VARCHAR(255)  NOT NULL,
    Slug               VARCHAR(300)  NOT NULL UNIQUE,
    Description        TEXT,
    Category           VARCHAR(100),
    Status             VARCHAR(50)   NOT NULL DEFAULT 'Draft',
    Venue              VARCHAR(500),
    City               VARCHAR(100),
    Province           VARCHAR(100),
    IsOnline           BOOLEAN       NOT NULL DEFAULT FALSE,
    ImageUrl           VARCHAR(1024),
    BannerImageUrl     VARCHAR(1024),
    MaxTicketsPerOrder INT           NOT NULL DEFAULT 10,
    StartAt            DATETIME      NOT NULL,
    EndAt              DATETIME      NOT NULL,
    CreatedAt          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_organizer FOREIGN KEY (OrganizerId) REFERENCES Users(Id) ON DELETE RESTRICT
);

CREATE TABLE TicketTypes (
    Id          CHAR(36)      NOT NULL PRIMARY KEY,
    EventId     CHAR(36)      NOT NULL,
    Name        VARCHAR(255)  NOT NULL,
    Description TEXT,
    Price       DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    Quota       INT           NOT NULL,
    SoldCount   INT           NOT NULL DEFAULT 0,
    MaxPerUser  INT           NOT NULL DEFAULT 10,
    SaleStartAt DATETIME,
    SaleEndAt   DATETIME,
    CreatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickettypes_event FOREIGN KEY (EventId) REFERENCES Events(Id) ON DELETE CASCADE
);

CREATE TABLE EventCollaborators (
    Id              VARCHAR(36)  NOT NULL PRIMARY KEY,
    UserId          VARCHAR(36),
    EventId         CHAR(36)     NOT NULL,
    Email           VARCHAR(255) NOT NULL,
    PermissionLevel VARCHAR(50)  NOT NULL DEFAULT 'Staff',
    InviteToken     VARCHAR(512),
    InvitedBy       VARCHAR(36)  NOT NULL,
    Status          VARCHAR(50)  NOT NULL DEFAULT 'Pending',
    InvitedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    AcceptedAt      DATETIME,
    ExpiresAt       DATETIME,
    CONSTRAINT fk_collab_user      FOREIGN KEY (UserId)    REFERENCES Users(Id)  ON DELETE SET NULL,
    CONSTRAINT fk_collab_event     FOREIGN KEY (EventId)   REFERENCES Events(Id) ON DELETE CASCADE,
    CONSTRAINT fk_collab_invitedby FOREIGN KEY (InvitedBy) REFERENCES Users(Id)  ON DELETE RESTRICT
);

-- ─────────────────────────────────────────────
-- ORDER & PAYMENT TABLES
-- ─────────────────────────────────────────────

CREATE TABLE Orders (
    Id          CHAR(36)      NOT NULL PRIMARY KEY,
    UserId      VARCHAR(36)   NOT NULL,
    Status      VARCHAR(50)   NOT NULL DEFAULT 'Pending',
    TotalAmount DECIMAL(18,2) NOT NULL,
    ExpiresAt   DATETIME,
    PaidAt      DATETIME,
    CreatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE RESTRICT
);

CREATE TABLE OrderItems (
    Id           CHAR(36)      NOT NULL PRIMARY KEY,
    OrderId      CHAR(36)      NOT NULL,
    TicketTypeId CHAR(36)      NOT NULL,
    Quantity     INT           NOT NULL DEFAULT 1,
    UnitPrice    DECIMAL(18,2) NOT NULL,
    CreatedAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orderitems_order      FOREIGN KEY (OrderId)      REFERENCES Orders(Id)      ON DELETE CASCADE,
    CONSTRAINT fk_orderitems_tickettype FOREIGN KEY (TicketTypeId) REFERENCES TicketTypes(Id) ON DELETE RESTRICT
);

CREATE TABLE Payments (
    Id          CHAR(36)      NOT NULL PRIMARY KEY,
    OrderId     CHAR(36)      NOT NULL UNIQUE,
    Provider    VARCHAR(100)  NOT NULL,
    ExternalRef VARCHAR(255),
    Amount      DECIMAL(18,2) NOT NULL,
    Status      VARCHAR(50)   NOT NULL DEFAULT 'Pending',
    CreatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ProcessedAt DATETIME,
    UpdatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- TICKET & CHECK-IN TABLES
-- ─────────────────────────────────────────────

CREATE TABLE Tickets (
    Id           CHAR(36)     NOT NULL PRIMARY KEY,
    OrderItemId  CHAR(36)     NOT NULL,
    UserId       VARCHAR(36)  NOT NULL,
    EventId      CHAR(36)     NOT NULL,
    TicketTypeId CHAR(36)     NOT NULL,
    QrCode       VARCHAR(512) NOT NULL UNIQUE,
    IsCheckedIn  BOOLEAN      NOT NULL DEFAULT FALSE,
    CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickets_orderitem  FOREIGN KEY (OrderItemId)  REFERENCES OrderItems(Id)  ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_user       FOREIGN KEY (UserId)       REFERENCES Users(Id)       ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_event      FOREIGN KEY (EventId)      REFERENCES Events(Id)      ON DELETE RESTRICT,
    CONSTRAINT fk_tickets_tickettype FOREIGN KEY (TicketTypeId) REFERENCES TicketTypes(Id) ON DELETE RESTRICT
);

CREATE TABLE CheckIn (
    Id        CHAR(36)    NOT NULL PRIMARY KEY,
    TicketId  CHAR(36)    NOT NULL UNIQUE,
    ScannedBy VARCHAR(36) NOT NULL,
    EventId   CHAR(36)    NOT NULL,
    ScannedAt DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_checkin_ticket    FOREIGN KEY (TicketId)  REFERENCES Tickets(Id) ON DELETE CASCADE,
    CONSTRAINT fk_checkin_scannedby FOREIGN KEY (ScannedBy) REFERENCES Users(Id)   ON DELETE RESTRICT,
    CONSTRAINT fk_checkin_event     FOREIGN KEY (EventId)   REFERENCES Events(Id)  ON DELETE RESTRICT
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX idx_users_email         ON Users(Email);
CREATE INDEX idx_users_deletedat     ON Users(DeletedAt);
CREATE INDEX idx_events_organizer    ON Events(OrganizerId);
CREATE INDEX idx_events_status       ON Events(Status);
CREATE INDEX idx_events_startat      ON Events(StartAt);
CREATE INDEX idx_tickettypes_event   ON TicketTypes(EventId);
CREATE INDEX idx_orders_user         ON Orders(UserId);
CREATE INDEX idx_orders_status       ON Orders(Status);
CREATE INDEX idx_orderitems_order    ON OrderItems(OrderId);
CREATE INDEX idx_tickets_user        ON Tickets(UserId);
CREATE INDEX idx_tickets_event       ON Tickets(EventId);
CREATE INDEX idx_checkin_event       ON CheckIn(EventId);
CREATE INDEX idx_refreshtoken_user   ON RefreshToken(UserId);
CREATE INDEX idx_authsession_user    ON AuthSession(UserId);
CREATE INDEX idx_securityevent_user  ON SecurityEvent(UserId);
CREATE INDEX idx_collab_event        ON EventCollaborators(EventId);
