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
}
