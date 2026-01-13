using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 简历分析服务接口
/// </summary>
public interface IResumeAnalyzerService
{
    /// <summary>
    /// 分析简历
    /// </summary>
    Task<AnalyzeResponse> AnalyzeAsync(AnalyzeRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// 流式分析简历（返回原始 AI 响应内容片段）
    /// </summary>
    IAsyncEnumerable<string> AnalyzeStreamAsync(AnalyzeRequest request, CancellationToken cancellationToken = default);
}
