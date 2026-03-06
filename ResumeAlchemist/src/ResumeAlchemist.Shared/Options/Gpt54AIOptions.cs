using System.ComponentModel.DataAnnotations;

namespace ResumeAlchemist.Shared.Options;

/// <summary>
/// GPT-5.4 配置选项（OpenAI 兼容接口）
/// </summary>
public class Gpt54AIOptions
{
    /// <summary>
    /// 配置节名称
    /// </summary>
    public const string SectionName = "Gpt54AI";

    /// <summary>
    /// API 基础地址
    /// </summary>
    [Required]
    public string BaseUrl { get; set; } = "http://74.48.108.97:8317/";

    /// <summary>
    /// API 密钥（可选：某些兼容网关允许匿名调用）
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// 模型名称
    /// </summary>
    [Required]
    public string Model { get; set; } = "gpt-5.4";

    /// <summary>
    /// 请求超时时间（秒）
    /// </summary>
    [Range(10, 300)]
    public int TimeoutSeconds { get; set; } = 120;
}
