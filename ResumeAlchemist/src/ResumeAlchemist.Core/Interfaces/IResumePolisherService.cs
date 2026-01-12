using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 简历润色服务接口
/// </summary>
public interface IResumePolisherService
{
    /// <summary>
    /// 润色简历
    /// </summary>
    Task<PolishResponse> PolishAsync(PolishRequest request, CancellationToken cancellationToken = default);
}
