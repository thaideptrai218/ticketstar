# Requirement & Design Specification
**PRN222**

**TicketStar — Event Ticketing Marketplace**

**Version:** 1.0

---

## Table of Contents

- [I. Overview](#i-overview)
  - [1. User Requirements](#1-user-requirements)
    - [1.1 Actors](#11-actors)
    - [1.2 Use Cases](#12-use-cases)
  - [2. Overall Functionalities](#2-overall-functionalities)
    - [2.1 Screens Flow](#21-screens-flow)
    - [2.2 Screen Descriptions](#22-screen-descriptions)
    - [2.3 Screen Authorization](#23-screen-authorization)
  - [3. System High Level Design](#3-system-high-level-design)
    - [3.1 Database Schema](#31-database-schema)
    - [3.2 Table Descriptions](#32-table-descriptions)
- [II. Web Application](#ii-web-application)
- [III. Students Contribution](#iii-students-contribution)
- [IV. Appendix](#iv-appendix)

---

## I. Overview

TicketStar is a full-stack event ticketing marketplace platform that enables event organizers to create and sell tickets, attendees to browse and purchase tickets via VietQR (SePay), and staff to perform QR-code-based check-in at events. The system enforces role-based access control (RBAC) with four roles: Admin, Organizer, Staff, and Attendee.

The project is built with .NET 8 (ASP.NET Core, EF Core, MySQL) on the backend and Next.js 15 (React 19, TypeScript, Tailwind CSS, shadcn/ui) on the frontend. Infrastructure includes MySQL 8, Redis 7, and RabbitMQ 3 managed via Docker Compose.

---

## 1. User Requirements

### 1.1 Actors

| # | Actor | Description |
|---|-------|-------------|
| 1 | **Guest** | Unauthenticated user who can browse public event listings and register/login. |
| 2 | **Attendee** | Registered user who browses events, purchases tickets, and presents QR codes for check-in. |
| 3 | **Organizer** | Creates and manages events, defines ticket types/pricing, views sales statistics, and manages payouts. |
| 4 | **Staff** | Scans attendee QR codes at events for check-in validation; assigned to events by Organizers. |
| 5 | **Admin** | Full system access: user management, event moderation, platform configuration, and reporting. |

---

### 1.2 Use Cases

#### a. Diagram(s)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TicketStar System                          │
│                                                                     │
│  ┌────────┐   Browse Events ────────────────────────────────────┐   │
│  │        │   View Event Details ───────────────────────────┐   │   │
│  │ Guest  │   Register Account ─────────────────────────┐   │   │   │
│  └────────┘                                             │   │   │   │
│                                                         ▼   ▼   ▼   │
│  ┌──────────┐  Login/Logout ──────────────────────────────────────  │
│  │          │  Browse & Search Events ──────────────────────────    │
│  │ Attendee │  Purchase Tickets (VietQR) ────────────────────────   │
│  │          │  View My Tickets (QR Display) ─────────────────────   │
│  └──────────┘  View Order History ─────────────────────────────    │
│                                                                     │
│  ┌───────────┐  Login/Logout ─────────────────────────────────     │
│  │           │  Create / Edit Events ─────────────────────────     │
│  │ Organizer │  Manage Ticket Types ──────────────────────────     │
│  │           │  View Sales Statistics ────────────────────────     │
│  └───────────┘  Manage Event Collaborators ────────────────────    │
│                 Upload Event Images ───────────────────────────    │
│                                                                     │
│  ┌───────┐   Login/Logout ────────────────────────────────────     │
│  │ Staff │   Scan QR Code (Check-In) ────────────────────────     │
│  │       │   View Event Attendee List ────────────────────────     │
│  └───────┘                                                         │
│                                                                     │
│  ┌───────┐   Manage Users ───────────────────────────────────     │
│  │       │   Manage Events ──────────────────────────────────     │
│  │ Admin │   View Platform Statistics ──────────────────────     │
│  │       │   Platform Configuration ─────────────────────────     │
│  └───────┘                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

#### b. Descriptions

| ID | Actor | Use Case | Description |
|----|-------|----------|-------------|
| 1 | Guest | Browse Events | View public event listings without login |
| 2 | Guest | View Event Details | View full event info, ticket types, and pricing |
| 3 | Guest | Register Account | Create account with email/password or Google OAuth |
| 4 | Attendee | Login / Logout | Authenticate via email/password, Google OAuth, or Magic Link |
| 5 | Attendee | Browse & Search Events | Search/filter events by keyword, category, date, location |
| 6 | Attendee | Purchase Tickets | Select ticket type, checkout via SePay VietQR payment |
| 7 | Attendee | View My Tickets | View purchased tickets with QR code for check-in |
| 8 | Attendee | View Order History | Track past and pending orders with payment status |
| 9 | Attendee | Manage Profile | Update personal info, avatar, phone number |
| 10 | Organizer | Login / Logout | Authenticate and access organizer dashboard |
| 11 | Organizer | Create Event | Fill in event details, location, dates, images, and category |
| 12 | Organizer | Manage Ticket Types | Define ticket tiers with name, price, quota, and sale period |
| 13 | Organizer | View Sales Statistics | Monitor ticket sales, revenue, and check-in rates per event |
| 14 | Organizer | Manage Collaborators | Invite Staff members to events with specific permission levels |
| 15 | Staff | Login / Logout | Authenticate and access staff check-in interface |
| 16 | Staff | Scan QR Code | Scan attendee QR codes for event entry validation |
| 17 | Staff | View Attendee List | View list of attendees and their check-in status for assigned events |
| 18 | Admin | Manage Users | View, edit, suspend, or delete user accounts |
| 19 | Admin | Manage Events | Monitor, approve, edit, or remove events from the platform |
| 20 | Admin | View Platform Statistics | Access platform-wide analytics and reports |

---

## 2. Overall Functionalities

### 2.1 Screens Flow

```
[Guest]
  Landing Page → Event Detail → Login/Register
                                    ↓
[Attendee]
  Home → Browse Events → Event Detail → Checkout → Payment (VietQR)
                                                        ↓
                                               My Tickets (QR Display)
  Profile Settings → Security (MFA Setup)

[Organizer]
  Organizer Dashboard → Create Event → Manage Ticket Types
                     → Event Detail (Manage) → Collaborators
                     → Sales Statistics

[Staff]
  Staff Dashboard → QR Check-In Scanner → Attendee List

[Admin]
  Admin Dashboard → User Management → Event Management → Reports
```

---

### 2.2 Screen Descriptions

| # | Feature | Screen | Description |
|---|---------|--------|-------------|
| 1 | Authentication | Login Page | Allows Attendees, Organizers, Staff, and Admins to authenticate via email/password, Google OAuth, or Magic Link |
| 2 | Authentication | Register Page | New users create an account with email and password |
| 3 | Authentication | Magic Link Verify | Verifies one-time login link sent to user's email |
| 4 | Authentication | MFA Setup | Users enable TOTP-based multi-factor authentication and save recovery codes |
| 5 | Home | Landing / Home Page | Displays featured events, search bar, and category navigation for guests and attendees |
| 6 | Event Discovery | Browse Events Page | Paginated, filterable list of all public events; supports search by keyword, date, and category |
| 7 | Event Discovery | Event Detail Page | Full event info: title, description, dates, venue, ticket types with pricing and availability |
| 8 | Ticket Purchase | Checkout Page | Attendee selects ticket type and quantity, reviews order summary |
| 9 | Ticket Purchase | Payment Page (VietQR) | Displays SePay VietQR code; waits for webhook confirmation of payment |
| 10 | My Tickets | My Tickets Page | Lists all purchased tickets per event with QR code display for check-in |
| 11 | Orders | Order History Page | Shows all past orders with status (Pending, Paid, Cancelled) |
| 12 | Profile | Profile Settings Page | User updates display name, avatar, phone number, and bio |
| 13 | Profile | Security Settings Page | Manage MFA (enable/disable), view active sessions |
| 14 | Organizer | Organizer Dashboard | Overview of organizer's events with revenue and sales KPIs |
| 15 | Organizer | Create / Edit Event | Form to set event title, description, location, dates, category, images |
| 16 | Organizer | Manage Ticket Types | CRUD interface for ticket tiers (name, price, quota, sale window) |
| 17 | Organizer | Event Collaborators | Invite staff by email with permission levels; manage pending/accepted invites |
| 18 | Organizer | Event Statistics | Per-event analytics: tickets sold, revenue, check-in rate |
| 19 | Staff | QR Check-In Scanner | Camera-based QR scanner; validates ticket and marks as checked in |
| 20 | Staff | Attendee List | List of all attendees for an event with check-in status |
| 21 | Admin | Admin Dashboard | Platform-wide stats: total users, events, orders, and revenue |
| 22 | Admin | User Management | Search, view, suspend, or delete user accounts; role assignment |
| 23 | Admin | Event Management | View/moderate all events across the platform |

---

### 2.3 Screen Authorization

| # | Screen | Admin | Organizer | Staff | Attendee | Guest |
|---|--------|-------|-----------|-------|----------|-------|
| 1 | Login Page | X | X | X | X | X |
| 2 | Register Page | | | | | X |
| 3 | Magic Link Verify | X | X | X | X | X |
| 4 | MFA Setup | X | X | X | X | |
| 5 | Home / Landing | X | X | X | X | X |
| 6 | Browse Events | X | X | X | X | X |
| 7 | Event Detail | X | X | X | X | X |
| 8 | Checkout | X | | | X | |
| 9 | Payment (VietQR) | X | | | X | |
| 10 | My Tickets | X | | | X | |
| 11 | Order History | X | | | X | |
| 12 | Profile Settings | X | X | X | X | |
| 13 | Security Settings | X | X | X | X | |
| 14 | Organizer Dashboard | X | X | | | |
| 15 | Create / Edit Event | X | X | | | |
| 16 | Manage Ticket Types | X | X | | | |
| 17 | Event Collaborators | X | X | | | |
| 18 | Event Statistics | X | X | | | |
| 19 | QR Check-In Scanner | X | X | X | | |
| 20 | Attendee List | X | X | X | | |
| 21 | Admin Dashboard | X | | | | |
| 22 | User Management | X | | | | |
| 23 | Event Management (Admin) | X | | | | |

---

## 3. System High Level Design

### 3.1 Database Schema

```
Users ──────────────── UserProfile (1:1)
  │                    OrganizerProfile (1:1)
  │                    AuthIdentity (1:N)
  │                    RefreshToken (1:N)
  │                    MagicLink (1:N)
  │                    SecurityEvent (1:N)
  │
  ├──[as Organizer]─── Events (1:N)
  │                      │
  │                      ├── TicketTypes (1:N)
  │                      │      │
  │                      │      └── OrderItems (1:N)
  │                      │              │
  │                      │              └── Tickets (1:N)
  │                      │                    │
  │                      │                    └── CheckIn (1:1)
  │                      │
  │                      └── EventCollaborators (1:N)
  │
  ├──[as Attendee]──── Orders (1:N)
  │                      │
  │                      ├── OrderItems (1:N)
  │                      └── Payment (1:1)
  │
  └──[as Staff]──────── CheckIn (1:N, via ScannedBy)
```

### 3.2 Table Descriptions

| No | Table | Description |
|----|-------|-------------|
| 1 | **Users** | Core account table. Stores Email, PasswordHash, Role (Admin/Organizer/Staff/User), MFA status, lockout state, and soft-delete timestamp. |
| 2 | **UserProfile** | Extended personal info linked 1:1 to Users. Stores FullName, AvatarUrl, Phone, Bio. |
| 3 | **OrganizerProfile** | Organizer business info linked 1:1 to Users. Stores OrganizationName, LogoUrl, Phone, Address, Website, social links. |
| 4 | **AuthIdentity** | External auth provider records (e.g., Google OAuth). Stores provider name and provider user ID per user. |
| 5 | **RefreshToken** | JWT refresh tokens with rotation. Stores hashed token, expiry, device info, and revocation state. |
| 6 | **MagicLink** | One-time login tokens sent by email. Stores hashed token, expiry, and usage status. |
| 7 | **AuthSession** | Active authenticated sessions. Tracks device/IP metadata for session management. |
| 8 | **SecurityEvent** | Audit trail for 21 security event types (login, MFA, password change, lockout, etc.). |
| 9 | **Events** | Core event table. Stores Title, Description, StartAt, EndAt, Venue, City, Province, Category, Status (Draft/Published/Cancelled/Completed), image URLs, and online flag. |
| 10 | **TicketTypes** | Ticket tiers per event. Stores Name, Price, Quota, SoldCount, MaxPerUser, SaleStartAt, SaleEndAt. |
| 11 | **EventCollaborators** | Staff/collaborator invitations per event. Stores Email, PermissionLevel, InviteToken, Status (Pending/Accepted/Revoked). |
| 12 | **Orders** | Purchase orders. Stores UserId, TotalAmount, Status (Pending/Paid/Cancelled/Expired), ExpiresAt, PaidAt. |
| 13 | **OrderItems** | Line items within an order. Links Order to TicketType with Quantity and UnitPrice snapshot. |
| 14 | **Tickets** | Individual tickets issued after payment. Each has a unique QrCode string and IsCheckedIn flag. |
| 15 | **Payments** | Payment records per order. Stores Provider (SePay), ExternalRef, Amount, Status (Pending/Completed/Failed), ProcessedAt. |
| 16 | **CheckIn** | Check-in records. Links Ticket to the Staff user who scanned it (ScannedBy), with ScannedAt timestamp. |
| 17 | **MfaRecoveryCodes** | Hashed one-time recovery codes for MFA bypass. Consumed on use. |
| 18 | **WebAuthnCredentials** | Passkey/WebAuthn credential records for passwordless authentication. |
| 19 | **EmailChangeRequests** | Pending email change requests with verification token and expiry. |

---

## II. Web Application

### 1. Login Page

| Field Name | Field Type | Description |
|------------|------------|-------------|
| Email | Text Input | User enters registered email address |
| Password | Password Input | User enters account password |
| Login | Button | Authenticates user with email/password; sets JWT httpOnly cookie |
| Continue with Google | Button | Initiates Google OAuth 2.0 login flow |
| Send Magic Link | Button | Sends a one-time login link to the provided email |
| MFA Code | Text Input | Appears when MFA is enabled; user enters 6-digit TOTP code |

---

### 2. Register Page

| Field Name | Field Type | Description |
|------------|------------|-------------|
| Email | Text Input | New user's email address (must be unique) |
| Password | Password Input | Account password (min 8 chars, complexity enforced) |
| Confirm Password | Password Input | Repeats password to confirm |
| Register | Button | Creates account and sends email verification |
| Continue with Google | Button | Registers via Google OAuth |

---

### 3. Home / Landing Page

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| Header | Logo | Link | Navigates to home page |
| Header | Browse Events | Navigation Link | Opens event listing page |
| Header | Login | Button | Navigates to login page (guest only) |
| Header | User Menu | Dropdown | Shows profile, my tickets, logout options (authenticated) |
| Hero | Search Keywords | Text Input | Keyword search for events |
| Hero | Search | Button | Submits search query |
| Featured Events | Event Card | Card / Link | Displays event thumbnail, title, date, location, and starting price |
| Featured Events | View All | Link | Navigates to full events list |
| Categories | Category Badge | Button | Filters events by category (Music, Sports, Tech, etc.) |

---

### 4. Browse Events Page

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| Filters | Keyword | Text Input | Full-text search on event title and description |
| Filters | Category | Dropdown | Filter by event category |
| Filters | Date Range | Date Picker | Filter events by start date range |
| Filters | Province | Dropdown | Filter events by province/city |
| Filters | Online Only | Checkbox | Show only online events |
| Results | Event Card | Card / Link | Shows event image, title, date, venue, and min ticket price |
| Results | Pagination | Buttons | Navigate between pages of results |

---

### 5. Event Detail Page

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| Header | Event Banner | Image | Full-width event banner image |
| Info | Event Title | Text | Name of the event |
| Info | Date & Time | Text | Start and end datetime of the event |
| Info | Venue / Location | Text | Address or online indicator |
| Info | Category | Badge | Event category label |
| Info | Organizer | Link | Organizer name with logo; links to organizer profile |
| Info | Description | Rich Text | Full event description |
| Tickets | Ticket Type Name | Text | Name of each ticket tier |
| Tickets | Price | Text | Price per ticket in VND |
| Tickets | Availability | Text | Remaining tickets or "Sold Out" |
| Tickets | Quantity Selector | Number Input | Attendee selects how many tickets to buy |
| Tickets | Add to Cart / Checkout | Button | Proceeds to checkout with selected tickets |

---

### 6. Checkout & Payment Page

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| Order Summary | Ticket Type | Text | Name and quantity of selected tickets |
| Order Summary | Unit Price | Text | Price per ticket |
| Order Summary | Total Amount | Text | Total amount to pay in VND |
| Payment | VietQR Code | Image | SePay-generated QR code for bank transfer |
| Payment | Bank Details | Text | Bank name, account number, and transfer note |
| Payment | Status | Live Indicator | Polls for payment webhook; shows Pending / Confirmed |
| Actions | Cancel Order | Button | Cancels the pending order |

---

### 7. My Tickets Page

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| Ticket Card | Event Name | Text | Name of the event |
| Ticket Card | Ticket Type | Text | Ticket tier name |
| Ticket Card | Event Date | Text | Date and time of the event |
| Ticket Card | Venue | Text | Event location |
| Ticket Card | QR Code | QR Image | Unique QR code for check-in scanning |
| Ticket Card | Status | Badge | Checked In / Valid |

---

### 8. Organizer Dashboard

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| KPIs | Total Events | Number | Count of all organizer's events |
| KPIs | Total Tickets Sold | Number | Aggregate tickets sold across all events |
| KPIs | Total Revenue | Number | Total revenue in VND |
| Event List | Event Title | Link | Name of event; clicks to event management page |
| Event List | Status | Badge | Draft / Published / Cancelled / Completed |
| Event List | Tickets Sold / Quota | Text | e.g., "120 / 500" |
| Event List | Actions | Buttons | Edit, View Stats, Manage Ticket Types |
| Actions | Create New Event | Button | Opens event creation form |

---

### 9. Create / Edit Event Page

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| Basic Info | Event Title | Text Input | Name of the event (required) |
| Basic Info | Description | Rich Text Editor | Full event description |
| Basic Info | Category | Dropdown | Select event category |
| Location | Is Online | Toggle | Switch between physical and online event |
| Location | Venue | Text Input | Venue name (physical events) |
| Location | City | Text Input | City name |
| Location | Province | Dropdown | Province selection |
| Dates | Start Date & Time | DateTime Picker | Event start datetime |
| Dates | End Date & Time | DateTime Picker | Event end datetime |
| Media | Event Image | File Upload | Thumbnail/cover image for event card |
| Media | Banner Image | File Upload | Wide banner image for event detail header |
| Settings | Max Tickets Per Order | Number Input | Cap on tickets per single purchase |
| Actions | Save as Draft | Button | Saves event without publishing |
| Actions | Publish | Button | Makes event visible to the public |

---

### 10. Manage Ticket Types Page

| Field Name | Field Type | Description |
|------------|------------|-------------|
| Ticket Name | Text Input | Name of the ticket tier (e.g., "VIP", "General Admission") |
| Description | Text Input | Short description of what this ticket includes |
| Price | Number Input | Ticket price in VND (0 for free tickets) |
| Quota | Number Input | Total number of tickets available |
| Max Per User | Number Input | Max tickets a single user can buy |
| Sale Start | DateTime Picker | When ticket sales open |
| Sale End | DateTime Picker | When ticket sales close |
| Save | Button | Creates or updates the ticket type |
| Delete | Button | Removes ticket type (only if no tickets sold) |

---

### 11. QR Check-In Scanner (Staff)

| Field Name | Field Type | Description |
|------------|------------|-------------|
| Camera Viewfinder | Video Stream | Live camera feed for QR code scanning |
| Scan Result | Status Banner | Shows "Valid - Check In Successful", "Already Checked In", or "Invalid QR" |
| Attendee Name | Text | Name of the ticket holder after successful scan |
| Ticket Type | Text | The ticket tier of the scanned ticket |
| Manual Lookup | Text Input | Search attendee by name or ticket ID manually |

---

### 12. Profile Settings Page

| Section | Field Name | Field Type | Description |
|---------|------------|------------|-------------|
| Avatar | Profile Photo | Image Upload | User uploads a profile picture |
| Personal Info | Full Name | Text Input | User's display name |
| Personal Info | Phone Number | Text Input | Contact phone number |
| Personal Info | Bio | Text Area | Short personal bio |
| Actions | Save Changes | Button | Persists profile updates |
| Account | Email | Text (read-only) | Displays current email; change requires verification |
| Account | Change Password | Button | Opens password change flow |

---

## III. Students Contribution

| Student Number | Full Name | Works | Percentage |
|----------------|-----------|-------|------------|
| HE19XXXX | Full name | Backend Auth System, JWT/MFA/Redis | 50% |
| HE19XXXX | Full name | Frontend, Event Management, Payment Integration | 50% |

---

## IV. Appendix

### 4.1. Assumptions & Dependencies

- **AS-1**: Users have stable internet access during event browsing and ticket purchase.
- **AS-2**: Payment is processed via SePay (VietQR) bank transfer; real-time webhook delivery is expected within 30 seconds.
- **AS-3**: Staff members are assigned to events by Organizers before the event date.
- **DE-1**: Requires MySQL 8, Redis 7, and RabbitMQ 3 running via Docker Compose.
- **DE-2**: Requires a valid SePay merchant account and webhook endpoint for payment processing.
- **DE-3**: Google OAuth requires a registered Google Cloud project with valid redirect URIs.
- **DE-4**: TOTP MFA requires an authenticator app on the user's mobile device (e.g., Google Authenticator).

### 4.2. Limitations & Exclusions

- **L-1**: The system does not support mobile native apps in the current version; web-only via responsive design.
- **L-2**: Refund processing is not automated; organizers handle refunds manually outside the system.
- **L-3**: Event analytics are limited to sales and check-in counts; advanced audience demographics are out of scope.
- **L-4**: Multi-currency support is excluded; all transactions are in Vietnamese Dong (VND).
- **L-5**: Real-time seat map selection is not supported; ticket purchases are quota-based only.

### 4.3. Business Rules

- **BR-1**: Default Admin account is provisioned via database seed; credentials are managed via environment variables.
- **BR-2**: A user with Role = Organizer must complete their OrganizerProfile before creating events.
- **BR-3**: An order expires after 15 minutes if payment is not confirmed; tickets are released back to quota.
- **BR-4**: A QR code can only be used for check-in once; duplicate scans return "Already Checked In".
- **BR-5**: Ticket sales respect the SaleStartAt and SaleEndAt window defined per ticket type.
- **BR-6**: Account lockout triggers after 5 failed login attempts; locked for 15 minutes.
- **BR-7**: Refresh tokens rotate on every use; old tokens are invalidated immediately.
- **BR-8**: MFA recovery codes are one-time use and are hashed at rest.
