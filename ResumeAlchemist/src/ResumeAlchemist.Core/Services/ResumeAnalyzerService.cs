using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Constants;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// 简历分析服务实现
/// </summary>
public class ResumeAnalyzerService : IResumeAnalyzerService
{
    private readonly IZhipuAIClient _aiClient;
    private readonly ILogger<ResumeAnalyzerService> _logger;

    public ResumeAnalyzerService(IZhipuAIClient aiClient, ILogger<ResumeAnalyzerService> logger)
    {
        _aiClient = aiClient;
        _logger = logger;
    }

    public async Task<AnalyzeResponse> AnalyzeAsync(AnalyzeRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始分析简历，行业: {IndustryId}", request.IndustryId);

        var systemPrompt = AnalyzePrompts.GetSystemPrompt(request.IndustryId);
        var userMessage = $"请分析以下简历：\n\n{request.Content}";

        var aiResponse = await _aiClient.ChatAsync(systemPrompt, userMessage, cancellationToken);

        var result = JsonHelper.ParseAIResponse<AnalyzeResponse>(aiResponse, _logger);

        if (result == null)
        {
            _logger.LogWarning("AI 响应解析失败，返回默认响应");
            return new AnalyzeResponse
            {
                Score = 60,
                Level = "C",
                Comment = "分析服务暂时不可用，请稍后重试。",
                Dimensions = new List<DimensionScore>(),
                Strengths = new List<string>(),
                Improvements = new List<ImprovementItem> 
                { 
                    new ImprovementItem 
                    { 
                        Problem = "分析服务异常", 
                        Original = "N/A", 
                        Example = "请稍后重试" 
                    } 
                }
            };
        }

        // 确保等级正确
        result.Level = ScoreLevel.GetLevel(result.Score);

        _logger.LogInformation("简历分析完成，评分: {Score}, 等级: {Level}", result.Score, result.Level);
        return result;
    }

    public async IAsyncEnumerable<string> AnalyzeStreamAsync(
        AnalyzeRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始流式分析简历，行业: {IndustryId}", request.IndustryId);

        var systemPrompt = AnalyzePrompts.GetSystemPrompt(request.IndustryId);
        var userMessage = $"请分析以下简历：\n\n{request.Content}";

        await foreach (var chunk in _aiClient.ChatStreamAsync(systemPrompt, userMessage, cancellationToken))
        {
            yield return chunk;
        }

        _logger.LogInformation("流式分析完成");
    }
}
