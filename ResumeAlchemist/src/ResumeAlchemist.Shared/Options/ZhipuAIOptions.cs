using System.ComponentModel.DataAnnotations;

namespace ResumeAlchemist.Shared.Options;

/// <summary>
/// 智谱 AI 配置选项
/// </summary>
public class ZhipuAIOptions
{
    /// <summary>
    /// 配置节名称
    /// </summary>
    public const string SectionName = "ZhipuAI";

    /// <summary>
    /// API 基础地址
    /// </summary>
    [Required]
    [Url]
    public string BaseUrl { get; set; } = "https://open.bigmodel.cn/api/paas/v4/";

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
    public string Model { get; set; } = "glm-4";

    /// <summary>
    /// 请求超时时间（秒）
    /// </summary>
    [Range(10, 300)]
    public int TimeoutSeconds { get; set; } = 120;
}
