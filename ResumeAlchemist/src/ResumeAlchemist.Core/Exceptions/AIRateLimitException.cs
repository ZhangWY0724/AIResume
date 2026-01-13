namespace ResumeAlchemist.Core.Exceptions;

/// <summary>
/// AI 服务请求频率超限异常
/// </summary>
public class AIRateLimitException : Exception
{
    /// <summary>
    /// 建议的重试等待时间（秒）
    /// </summary>
    public int? RetryAfterSeconds { get; }

    public AIRateLimitException()
        : base("AI 服务请求过于频繁，请稍后重试")
    {
    }

    public AIRateLimitException(string message)
        : base(message)
    {
    }

    public AIRateLimitException(string message, int retryAfterSeconds)
        : base(message)
    {
        RetryAfterSeconds = retryAfterSeconds;
    }

    public AIRateLimitException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
