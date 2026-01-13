using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 简历润色服务接口
/// </summary>
public interface IResumePolisherService
{
    /// <summary>
    /// 流式润色简历（返回纯Markdown文本流）
    /// </summary>
    IAsyncEnumerable<string> PolishStreamAsync(PolishRequest request, CancellationToken cancellationToken = default);
}
