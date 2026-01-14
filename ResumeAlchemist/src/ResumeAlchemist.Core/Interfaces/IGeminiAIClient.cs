namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// Gemini AI 客户端接口
/// </summary>
public interface IGeminiAIClient
{
    /// <summary>
    /// 发送聊天请求（非流式）
    /// </summary>
    /// <param name="systemPrompt">系统提示词</param>
    /// <param name="userMessage">用户消息</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>AI 响应内容</returns>
    Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default);

    /// <summary>
    /// 发送流式聊天请求
    /// </summary>
    /// <param name="systemPrompt">系统提示词</param>
    /// <param name="userMessage">用户消息</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>AI 响应内容片段的异步枚举</returns>
    IAsyncEnumerable<string> ChatStreamAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default);
}
