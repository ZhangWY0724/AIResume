namespace ResumeAlchemist.Shared.DTOs;

/// <summary>
/// SSE 事件类型
/// </summary>
public static class SseEventType
{
    /// <summary>
    /// 进度更新事件
    /// </summary>
    public const string Progress = "progress";

    /// <summary>
    /// 完成事件
    /// </summary>
    public const string Complete = "complete";

    /// <summary>
    /// 错误事件
    /// </summary>
    public const string Error = "error";
}

/// <summary>
/// SSE 进度事件数据
/// </summary>
public class SseProgressData
{
    /// <summary>
    /// 进度百分比 (0-100)
    /// </summary>
    public int Percentage { get; set; }

    /// <summary>
    /// 当前阶段描述
    /// </summary>
    public string Stage { get; set; } = string.Empty;

    /// <summary>
    /// 详细消息
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// SSE 错误事件数据
/// </summary>
public class SseErrorData
{
    /// <summary>
    /// 错误消息
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// 错误代码
    /// </summary>
    public string? Code { get; set; }
}
