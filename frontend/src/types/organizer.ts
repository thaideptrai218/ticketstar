// Types for organizer dashboard, payout, and staff management

export interface OrganizerEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  venue: string | null;
  category?: string | null;
  imageUrl: string | null;
  bannerImageUrl?: string | null;
  isOnline: boolean;
  status: string;
  totalTicketCount: number;
  availableTicketCount: number;
  minPrice: number;
}

export interface PayoutSummary {
  eventId: string;
  eventTitle: string;
  totalRevenue: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netPayout: number;
  ticketTypeBreakdown: PayoutTicketTypeBreakdown[];
}

export interface PayoutTicketTypeBreakdown {
  ticketTypeId: string;
  ticketTypeName: string;
  ticketsSold: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrganizerPayoutOverview {
  totalRevenue: number;
  totalFees: number;
  totalNetPayout: number;
  events: PayoutSummary[];
}

export type CollaboratorPermissionLevel = "Viewer" | "Operator" | "Manager";
export type CollaboratorStatus = "Pending" | "Accepted" | "Declined" | "Revoked";

export interface Collaborator {
  id: string;
  userId?: string;
  email: string;
  fullName?: string;
  permissionLevel: CollaboratorPermissionLevel;
  status: CollaboratorStatus;
  invitedAt: string;
  acceptedAt?: string;
}

export interface CollaborationEvent {
  eventId: string;
  title: string;
  venue?: string;
  startAt: string;
  endAt: string;
  status: string;
  permissionLevel: CollaboratorPermissionLevel;
}

export interface CheckInStats {
  totalTickets: number;
  checkedInTickets: number;
  pendingTickets: number;
}

export interface CheckInResponse {
  ticketId: string;
  ticketTypeName: string;
  attendeeName: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  scannerName: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  isLocked: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}
