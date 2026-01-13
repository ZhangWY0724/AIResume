using System.Net;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using ResumeAlchemist.Core.Exceptions;

namespace ResumeAlchemist.Api.Middleware;

/// <summary>
/// 全局异常处理中间件
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AIRateLimitException ex)
        {
            _logger.LogWarning(ex, "AI 服务请求频率超限");
            await HandleRateLimitExceptionAsync(context, ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "未处理的异常");
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleRateLimitExceptionAsync(HttpContext context, AIRateLimitException exception)
    {
        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;

        // 添加 Retry-After 响应头
        if (exception.RetryAfterSeconds.HasValue)
        {
            context.Response.Headers.Append("Retry-After", exception.RetryAfterSeconds.Value.ToString());
        }

        var response = new ErrorResponse
        {
            Code = "RATE_LIMIT_EXCEEDED",
            Message = exception.Message,
            RetryAfterSeconds = exception.RetryAfterSeconds
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, _jsonOptions));
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new ErrorResponse
        {
            Code = "INTERNAL_ERROR",
            Message = "服务器内部错误，请稍后重试"
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, _jsonOptions));
    }
}

/// <summary>
/// 错误响应模型
/// </summary>
public class ErrorResponse
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? RetryAfterSeconds { get; set; }
}

/// <summary>
/// 中间件扩展方法
/// </summary>
public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseExceptionHandling(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}
