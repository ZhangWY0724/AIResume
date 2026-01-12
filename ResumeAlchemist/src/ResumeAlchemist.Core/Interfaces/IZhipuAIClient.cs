namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// AI 客户端接口
/// </summary>
public interface IZhipuAIClient
{
    /// <summary>
    /// 发送聊天请求
    /// </summary>
    /// <param name="systemPrompt">系统提示词</param>
    /// <param name="userMessage">用户消息</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>AI 响应内容</returns>
    Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default);
}
