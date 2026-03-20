// Ticket types matching backend TicketDtos

export interface MyTicket {
  id: string;
  orderId: string;
  eventId: string;
  eventTitle: string;
  eventVenue: string | null;
  eventStartAt: string;
  ticketTypeName: string;
  isCheckedIn: boolean;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  eventId: string;
  eventTitle: string;
  eventVenue: string | null;
  eventStartAt: string;
  eventEndAt: string;
  ticketTypeName: string;
  price: number;
  qrCodeBase64: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
}

export interface TransferTicketRequest {
  recipientEmail: string;
}
