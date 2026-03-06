using System.ComponentModel.DataAnnotations;

namespace ResumeAlchemist.Shared.Options;

/// <summary>
/// Kilo AI 配置选项（OpenAI 兼容网关）
/// </summary>
public class KiloAIOptions
{
    /// <summary>
    /// 配置节名称
    /// </summary>
    public const string SectionName = "KiloAI";

    /// <summary>
    /// API 基础地址
    /// </summary>
    [Required]
    [Url]
    public string BaseUrl { get; set; } = "https://api.kilo.ai/api/gateway/";

    /// <summary>
    /// API 密钥
    /// </summary>
    [Required]
    [MinLength(10)]
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// 模型名称
    /// </summary>
    [Required]
    public string Model { get; set; } = "kilo/auto-free";

    /// <summary>
    /// 请求超时时间（秒）
    /// </summary>
    [Range(10, 300)]
    public int TimeoutSeconds { get; set; } = 120;
}
