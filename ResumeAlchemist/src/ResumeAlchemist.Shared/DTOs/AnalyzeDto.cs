namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 简历分析请求
/// </summary>
public class AnalyzeRequest
{
    /// <summary>
    /// 简历文本内容
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 行业ID (tech/finance/marketing/general)
    /// </summary>
    public string IndustryId { get; set; } = "general";
}

/// <summary>
/// 简历分析响应
/// </summary>
public class AnalyzeResponse
{
    /// <summary>
    /// 总体评分 (0-100)
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// 评分等级 (S/A/B/C/D)
    /// </summary>
    public string Level { get; set; } = string.Empty;

    /// <summary>
    /// 各维度分析结果
    /// </summary>
    public List<DimensionScore> Dimensions { get; set; } = new();

    /// <summary>
    /// AI 点评
    /// </summary>
    public string Comment { get; set; } = string.Empty;

    /// <summary>
    /// 优势列表
    /// </summary>
    public List<string> Strengths { get; set; } = new();

    /// <summary>
    /// 改进建议列表
    /// </summary>
    public List<string> Improvements { get; set; } = new();

    /// <summary>
    /// ATS 友好度评分 (0-100)
    /// </summary>
    public int AtsScore { get; set; }

    /// <summary>
    /// 缺失的行业关键词
    /// </summary>
    public List<string> MissingKeywords { get; set; } = new();
}

/// <summary>
/// 维度评分
/// </summary>
public class DimensionScore
{
    /// <summary>
    /// 维度名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 维度评分 (0-100)
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// 评价说明
    /// </summary>
    public string Comment { get; set; } = string.Empty;
}
