using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 职位匹配服务接口
/// </summary>
public interface IJDMatcherService
{
    /// <summary>
    /// 匹配简历与职位
    /// </summary>
    Task<MatchResponse> MatchAsync(MatchRequest request, CancellationToken cancellationToken = default);
}
