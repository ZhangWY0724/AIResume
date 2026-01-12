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
}

/// <summary>
/// 简历润色响应
/// </summary>
public class PolishResponse
{
    /// <summary>
    /// 润色后的全文
    /// </summary>
    public string PolishedContent { get; set; } = string.Empty;

    /// <summary>
    /// 修改详情列表
    /// </summary>
    public List<PolishChange> Changes { get; set; } = new();

    /// <summary>
    /// 润色说明摘要
    /// </summary>
    public string Summary { get; set; } = string.Empty;
}

/// <summary>
/// 润色修改详情
/// </summary>
public class PolishChange
{
    /// <summary>
    /// 原文
    /// </summary>
    public string Original { get; set; } = string.Empty;

    /// <summary>
    /// 修改后
    /// </summary>
    public string Polished { get; set; } = string.Empty;

    /// <summary>
    /// 修改原因
    /// </summary>
    public string Reason { get; set; } = string.Empty;
}
