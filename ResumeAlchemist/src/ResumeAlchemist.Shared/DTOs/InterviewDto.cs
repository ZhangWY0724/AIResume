namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// 面试问题预测请求
/// </summary>
public class InterviewRequest
{
    /// <summary>
    /// 简历文本内容
    /// </summary>
    public string ResumeContent { get; set; } = string.Empty;

    /// <summary>
    /// 目标职位（可选）
    /// </summary>
    public string? TargetPosition { get; set; }

    /// <summary>
    /// 行业ID
    /// </summary>
    public string IndustryId { get; set; } = "general";
}

/// <summary>
/// 面试问题预测响应
/// </summary>
public class InterviewResponse
{
    /// <summary>
    /// 预测的面试问题列表
    /// </summary>
    public List<InterviewQuestion> Questions { get; set; } = new();

    /// <summary>
    /// 面试准备建议
    /// </summary>
    public string PreparationTips { get; set; } = string.Empty;
}

/// <summary>
/// 面试问题
/// </summary>
public class InterviewQuestion
{
    /// <summary>
    /// 问题类别 (技术深度/项目经验/行为面试/职业规划)
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// 面试问题
    /// </summary>
    public string Question { get; set; } = string.Empty;

    /// <summary>
    /// 为什么会问这个问题
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// 回答建议
    /// </summary>
    public string Tips { get; set; } = string.Empty;

    /// <summary>
    /// 难度等级 (简单/中等/困难)
    /// </summary>
    public string Difficulty { get; set; } = "中等";
}
