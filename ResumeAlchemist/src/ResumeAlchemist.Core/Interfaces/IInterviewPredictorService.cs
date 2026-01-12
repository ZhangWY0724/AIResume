using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 面试问题预测服务接口
/// </summary>
public interface IInterviewPredictorService
{
    /// <summary>
    /// 预测面试问题
    /// </summary>
    Task<InterviewResponse> PredictAsync(InterviewRequest request, CancellationToken cancellationToken = default);
}
