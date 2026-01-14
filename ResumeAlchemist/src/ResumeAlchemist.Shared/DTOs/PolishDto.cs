namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 简历润色请求
/// </summary>
public class PolishRequest
{
    /// <summary>
    /// 简历文本内容
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 行业ID
    /// </summary>
    public string IndustryId { get; set; } = "general";

    /// <summary>
    /// 目标职位
    /// </summary>
    public string? TargetPosition { get; set; }

    /// <summary>
    /// AI 模型类型
    /// </summary>
    public AIModelType ModelType { get; set; } = AIModelType.Zhipu;
}
