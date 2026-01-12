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
    private readonly IZhipuAIClient _aiClient;
    private readonly ILogger<ResumePolisherService> _logger;

    public ResumePolisherService(IZhipuAIClient aiClient, ILogger<ResumePolisherService> logger)
    {
        _aiClient = aiClient;
        _logger = logger;
    }

    public async Task<PolishResponse> PolishAsync(PolishRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始润色简历，行业: {IndustryId}, 目标职位: {Position}",
            request.IndustryId, request.TargetPosition ?? "未指定");

        var systemPrompt = PolishPrompts.GetSystemPrompt(request.IndustryId, request.TargetPosition);
        var userMessage = $"请润色以下简历：\n\n{request.Content}";

        var aiResponse = await _aiClient.ChatAsync(systemPrompt, userMessage, cancellationToken);

        var result = JsonHelper.ParseAIResponse<PolishResponse>(aiResponse, _logger);

        if (result == null)
        {
            _logger.LogWarning("AI 响应解析失败，返回默认响应");
            return new PolishResponse
            {
                PolishedContent = request.Content,
                Changes = new List<PolishChange>(),
                Summary = "润色服务暂时不可用，请稍后重试。"
            };
        }

        _logger.LogInformation("简历润色完成，修改项: {Count}", result.Changes.Count);
        return result;
    }
}
