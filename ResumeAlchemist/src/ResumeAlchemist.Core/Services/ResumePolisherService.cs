using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Constants;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// 简历润色服务实现
/// </summary>
public class ResumePolisherService : IResumePolisherService
{
    private readonly IZhipuAIClient _zhipuClient;
    private readonly IGeminiAIClient _geminiClient;
    private readonly ILogger<ResumePolisherService> _logger;

    public ResumePolisherService(
        IZhipuAIClient zhipuClient,
        IGeminiAIClient geminiClient,
        ILogger<ResumePolisherService> logger)
    {
        _zhipuClient = zhipuClient;
        _geminiClient = geminiClient;
        _logger = logger;
    }

    public async IAsyncEnumerable<string> PolishStreamAsync(
        PolishRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始流式润色简历，行业: {IndustryId}, 目标职位: {Position}, 模型: {ModelType}",
            request.IndustryId, request.TargetPosition ?? "未指定", request.ModelType);

        var systemPrompt = PolishPrompts.GetSystemPrompt(request.IndustryId, request.TargetPosition);
        var userMessage = $"请润色以下简历：\n\n{request.Content}";

        var streamSource = request.ModelType == AIModelType.Gemini
            ? _geminiClient.ChatStreamAsync(systemPrompt, userMessage, cancellationToken)
            : _zhipuClient.ChatStreamAsync(systemPrompt, userMessage, cancellationToken);

        await foreach (var chunk in streamSource)
        {
            yield return chunk;
        }

        _logger.LogInformation("流式润色完成");
    }
}
