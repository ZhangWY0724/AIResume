using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Constants;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// 面试问题预测服务实现
/// </summary>
public class InterviewPredictorService : IInterviewPredictorService
{
    private readonly IAIClientFactory _aiClientFactory;
    private readonly ILogger<InterviewPredictorService> _logger;

    public InterviewPredictorService(
        IAIClientFactory aiClientFactory,
        ILogger<InterviewPredictorService> logger)
    {
        _aiClientFactory = aiClientFactory;
        _logger = logger;
    }

    public async Task<InterviewResponse> PredictAsync(InterviewRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始预测面试问题，行业: {IndustryId}, 目标职位: {Position}, 模型: {ModelType}",
            request.IndustryId, request.TargetPosition ?? "未指定", request.ModelType);

        var systemPrompt = InterviewPrompts.GetSystemPrompt(request.IndustryId, request.TargetPosition);
        var userMessage = $"请基于以下简历预测面试问题：\n\n{request.ResumeContent}";

        var aiClient = _aiClientFactory.GetClient(request.ModelType);
        var aiResponse = await aiClient.ChatAsync(systemPrompt, userMessage, cancellationToken);

        var result = JsonHelper.ParseAIResponse<InterviewResponse>(aiResponse, _logger);

        if (result == null)
        {
            _logger.LogWarning("AI 响应解析失败，返回默认响应");
            return new InterviewResponse
            {
                Questions = new List<InterviewQuestion>(),
                PreparationTips = "面试预测服务暂时不可用，请稍后重试。"
            };
        }

        _logger.LogInformation("面试问题预测完成，问题数: {Count}", result.Questions.Count);
        return result;
    }
}
