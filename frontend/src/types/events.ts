// Event types matching backend DTOs (EventDtos.cs)

export interface EventListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  venue: string | null;
  category: string | null;
  imageUrl: string | null;
  bannerImageUrl?: string | null;
  isOnline: boolean;
  status: string;
  totalTicketCount: number;
  availableTicketCount: number;
  minPrice: number;
}

export interface EventDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  venue: string | null;
  city?: string | null;
  province?: string | null;
  category: string | null;
  status: string;
  imageUrl: string | null;
  bannerImageUrl?: string | null;
  isOnline: boolean;
  maxTicketsPerOrder?: number | null;
  refundPolicy?: string | null;
  contentWarning?: string | null;
  paymentTerms?: string | null;
  organizerId: string;
  organizerName: string;
  organizerLogoUrl?: string | null;
  ticketTypes: TicketType[];
  createdAt: string;
}

export interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quota: number;
  soldCount: number;
  availableCount: number;
  maxPerUser: number;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
}
