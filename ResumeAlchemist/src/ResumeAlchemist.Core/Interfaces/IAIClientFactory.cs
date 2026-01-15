using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// AI 客户端工厂接口
/// </summary>
public interface IAIClientFactory
{
    /// <summary>
    /// 根据模型类型获取对应的 AI 客户端
    /// </summary>
    /// <param name="modelType">AI 模型类型</param>
    /// <returns>对应的 AI 客户端实例</returns>
    IAIClient GetClient(AIModelType modelType);
}
