// Order types matching backend DTOs (OrderDtos.cs)

export interface CreateOrderRequest {
  eventId: string;
  items: CreateOrderItem[];
}

export interface CreateOrderItem {
  ticketTypeId: string;
  quantity: number;
}

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  paymentUrl: string | null;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Backend OrderDetailResponse does NOT include paymentUrl — separate type, not extending Order
export interface OrderDetail {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  items: OrderItem[];
  tickets: OrderTicket[] | null;
  payment: OrderPayment | null;
}

export interface OrderTicket {
  id: string;
  ticketTypeName: string;
  qrCodeBase64: string;
  isCheckedIn: boolean;
}

export interface OrderPayment {
  id: string;
  provider: string;
  externalRef: string | null;
  amount: number;
  processedAt: string | null;
}
