namespace TicketStar.Application.Common;

public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public ResultError? ErrorType { get; }

    private Result(T value) { IsSuccess = true; Value = value; }
    private Result(string error, ResultError errorType) { IsSuccess = false; Error = error; ErrorType = errorType; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error, ResultError errorType = ResultError.Validation) => new(error, errorType);
}

public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public ResultError? ErrorType { get; }

    private Result() { IsSuccess = true; }
    private Result(string error, ResultError errorType) { IsSuccess = false; Error = error; ErrorType = errorType; }

    public static Result Success() => new();
    public static Result Failure(string error, ResultError errorType = ResultError.Validation) => new(error, errorType);
}
