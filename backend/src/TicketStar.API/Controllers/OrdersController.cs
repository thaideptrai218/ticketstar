using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketStar.Application.Interfaces;
using TicketStar.Application.DTOs.Orders;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/orders")]
public class OrdersController : ApiControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyOrders(CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _orderService.GetUserOrdersAsync(userId, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _orderService.GetOrderByIdAsync(id, userId, ct));
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        var result = await _orderService.CreateOrderAsync(userId, request, ct);
        return CreatedFromResult(result, nameof(GetOrder), result.IsSuccess ? new { id = result.Value!.Id } : null);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _orderService.CancelOrderAsync(id, userId, ct));
    }

    [HttpPost("{id:guid}/refund")]
    public async Task<IActionResult> RefundOrder(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _orderService.RefundOrderAsync(id, userId, ct));
    }

    [HttpPost("{id:guid}/simulate-payment")]
    public async Task<IActionResult> SimulatePayment(Guid id, CancellationToken ct)
    {
        var userId = GetUserId() ?? "";
        return FromResult(await _orderService.SimulatePaymentAsync(id, userId, ct));
    }
}
