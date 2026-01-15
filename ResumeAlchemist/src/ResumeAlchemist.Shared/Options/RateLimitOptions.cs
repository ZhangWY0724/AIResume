using System.ComponentModel.DataAnnotations;

namespace ResumeAlchemist.Shared.Options;

/// <summary>
/// 限流配置选项
/// </summary>
public class RateLimitOptions
{
    /// <summary>
    /// 配置节名称
    /// </summary>
    public const string SectionName = "RateLimit";

    /// <summary>
    /// 是否启用限流
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// 时间窗口内允许的最大请求数
    /// </summary>
    [Range(1, 10000)]
    public int PermitLimit { get; set; } = 100;

    /// <summary>
    /// 时间窗口（秒）
    /// </summary>
    [Range(1, 3600)]
    public int WindowSeconds { get; set; } = 60;

    /// <summary>
    /// 队列限制（排队等待的请求数）
    /// </summary>
    [Range(0, 1000)]
    public int QueueLimit { get; set; } = 10;

    /// <summary>
    /// AI 接口每分钟最大请求数（更严格的限制）
    /// </summary>
    [Range(1, 1000)]
    public int AIPermitLimit { get; set; } = 20;
}
