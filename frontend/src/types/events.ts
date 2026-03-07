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
  status: string;
  imageUrl: string | null;
  organizerId: string;
  organizerName: string;
  ticketTypes: TicketType[];
  createdAt: string;
}

export interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  quota: number;
  soldCount: number;
  availableCount: number;
  maxPerUser: number;
}
