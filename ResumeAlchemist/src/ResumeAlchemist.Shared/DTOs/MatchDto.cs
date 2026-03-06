namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 职位匹配请求
/// </summary>
public class MatchRequest
{
    /// <summary>
    /// 简历文本内容
    /// </summary>
    public string ResumeContent { get; set; } = string.Empty;

    /// <summary>
    /// 职位描述 (JD)
    /// </summary>
    public string JobDescription { get; set; } = string.Empty;

    /// <summary>
    /// 行业ID
    /// </summary>
    public string IndustryId { get; set; } = "general";

    /// <summary>
    /// AI 模型类型
    /// </summary>
    public AIModelType ModelType { get; set; } = AIModelType.Kilo;
}

/// <summary>
/// 职位匹配响应
/// </summary>
public class MatchResponse
{
    /// <summary>
    /// 匹配度评分 (0-100)
    /// </summary>
    public int MatchScore { get; set; }

    /// <summary>
    /// 匹配等级
    /// </summary>
    public string MatchLevel { get; set; } = string.Empty;

    /// <summary>
    /// 匹配分析说明
    /// </summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>
    /// 匹配的技能/关键词
    /// </summary>
    public List<KeywordMatch> MatchedKeywords { get; set; } = new();

    /// <summary>
    /// 缺失的关键技能
    /// </summary>
    public List<string> MissingKeywords { get; set; } = new();

    /// <summary>
    /// 优化建议
    /// </summary>
    public List<string> Suggestions { get; set; } = new();
}

/// <summary>
/// 关键词匹配详情
/// </summary>
public class KeywordMatch
{
    /// <summary>
    /// 关键词
    /// </summary>
    public string Keyword { get; set; } = string.Empty;

    /// <summary>
    /// 是否匹配
    /// </summary>
    public bool IsMatched { get; set; }

    /// <summary>
    /// 重要程度 (high/medium/low)
    /// </summary>
    public string Importance { get; set; } = "medium";
}
