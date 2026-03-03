namespace TicketStar.Application.DTOs.Orders;

public record CreateOrderRequest(
    Guid EventId,
    List<CreateOrderItemRequest> Items
);

public record CreateOrderItemRequest(
    Guid TicketTypeId,
    int Quantity
);

public record OrderResponse(
    Guid Id,
    string Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime? ExpiresAt,
    DateTime? PaidAt,
    string? PaymentUrl,
    List<OrderItemResponse> Items
);

public record OrderItemResponse(
    Guid Id,
    Guid TicketTypeId,
    string TicketTypeName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal
);

public record OrderDetailResponse(
    Guid Id,
    string Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime? ExpiresAt,
    DateTime? PaidAt,
    List<OrderItemResponse> Items,
    List<TicketResponse>? Tickets,
    PaymentResponse? Payment
);

public record PaymentResponse(
    Guid Id,
    string Provider,
    string? ExternalRef,
    decimal Amount,
    DateTime? ProcessedAt
);

public record SePayWebhookRequest
{
    public string? Content { get; init; }
    public decimal Amount { get; init; }
    public string? Signature { get; init; }
}

public record TicketResponse(
    Guid Id,
    string TicketTypeName,
    string QrCodeBase64,
    bool IsCheckedIn
);
