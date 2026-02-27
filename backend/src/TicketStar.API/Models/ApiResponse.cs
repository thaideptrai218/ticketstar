namespace TicketStar.API.Models;

public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public string? TraceId { get; init; }

    public static ApiResponse<T> Ok(T data, string? traceId = null)
        => new() { Success = true, Data = data, TraceId = traceId };

    public static ApiResponse<T> Fail(string error, string? traceId = null)
        => new() { Success = false, Error = error, TraceId = traceId };
}

public class ApiResponse
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public string? Error { get; init; }
    public string? TraceId { get; init; }

    public static ApiResponse Ok(string? message = null, string? traceId = null)
        => new() { Success = true, Message = message, TraceId = traceId };

    public static ApiResponse Fail(string error, string? traceId = null)
        => new() { Success = false, Error = error, TraceId = traceId };
}
