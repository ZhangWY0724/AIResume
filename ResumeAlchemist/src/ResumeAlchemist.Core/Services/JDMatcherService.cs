using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Constants;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// 职位匹配服务实现
/// </summary>
public class JDMatcherService : IJDMatcherService
{
    private readonly IZhipuAIClient _zhipuClient;
    private readonly IGeminiAIClient _geminiClient;
    private readonly ILogger<JDMatcherService> _logger;

    public JDMatcherService(
        IZhipuAIClient zhipuClient,
        IGeminiAIClient geminiClient,
        ILogger<JDMatcherService> logger)
    {
        _zhipuClient = zhipuClient;
        _geminiClient = geminiClient;
        _logger = logger;
    }

    public async Task<MatchResponse> MatchAsync(MatchRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始职位匹配分析，行业: {IndustryId}, 模型: {ModelType}", request.IndustryId, request.ModelType);

        var systemPrompt = MatchPrompts.GetSystemPrompt(request.IndustryId);
        var userMessage = MatchPrompts.GetUserPrompt(request.ResumeContent, request.JobDescription);

        var aiResponse = request.ModelType == AIModelType.Gemini
            ? await _geminiClient.ChatAsync(systemPrompt, userMessage, cancellationToken)
            : await _zhipuClient.ChatAsync(systemPrompt, userMessage, cancellationToken);

        var result = JsonHelper.ParseAIResponse<MatchResponse>(aiResponse, _logger);

        if (result == null)
        {
            _logger.LogWarning("AI 响应解析失败，返回默认响应");
            return new MatchResponse
            {
                MatchScore = 50,
                MatchLevel = "匹配度未知",
                Summary = "匹配分析服务暂时不可用，请稍后重试。",
                MatchedKeywords = new List<KeywordMatch>(),
                MissingKeywords = new List<string>(),
                Suggestions = new List<string> { "请稍后重试匹配功能" }
            };
        }

        // 确保匹配等级正确
        result.MatchLevel = ScoreLevel.GetMatchLevel(result.MatchScore);

        _logger.LogInformation("职位匹配分析完成，匹配度: {Score}, 等级: {Level}",
            result.MatchScore, result.MatchLevel);
        return result;
    }
}
