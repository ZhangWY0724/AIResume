using System.Runtime.CompilerServices;
using System.Text.Json;
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
    private readonly IAIClientFactory _aiClientFactory;
    private readonly ILogger<ResumeAnalyzerService> _logger;

    public ResumeAnalyzerService(
        IAIClientFactory aiClientFactory,
        ILogger<ResumeAnalyzerService> logger)
    {
        _aiClientFactory = aiClientFactory;
        _logger = logger;
    }

    public async Task<AnalyzeResponse> AnalyzeAsync(AnalyzeRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始分析简历，行业: {IndustryId}, 模型: {ModelType}", request.IndustryId, request.ModelType);

        var systemPrompt = AnalyzePrompts.GetSystemPrompt(request.IndustryId);
        var userMessage = $"请分析以下简历：\n\n{request.Content}";

        var aiClient = _aiClientFactory.GetClient(request.ModelType);
        var aiResponse = await aiClient.ChatAsync(systemPrompt, userMessage, cancellationToken);

        var result = TryParseFromAllJsonObjects(aiResponse) ?? JsonHelper.ParseAIResponse<AnalyzeResponse>(aiResponse, _logger);

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
        _logger.LogInformation("开始流式分析简历，行业: {IndustryId}, 模型: {ModelType}", request.IndustryId, request.ModelType);

        var systemPrompt = AnalyzePrompts.GetSystemPrompt(request.IndustryId);
        var userMessage = $"请分析以下简历：\n\n{request.Content}";

        var aiClient = _aiClientFactory.GetClient(request.ModelType);

        await foreach (var chunk in aiClient.ChatStreamAsync(systemPrompt, userMessage, cancellationToken))
        {
            yield return chunk;
        }

        _logger.LogInformation("流式分析完成");
    }

    /// <summary>
    /// 从文本中提取所有完整 JSON 对象（支持字符串、转义、嵌套括号）
    /// </summary>
    private static IEnumerable<string> ExtractCompleteJsonObjects(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            yield break;
        }

        var start = -1;
        var depth = 0;
        var inString = false;
        var escape = false;

        for (var i = 0; i < content.Length; i++)
        {
            var c = content[i];

            if (escape)
            {
                escape = false;
                continue;
            }

            if (c == '\\' && inString)
            {
                escape = true;
                continue;
            }

            if (c == '"')
            {
                inString = !inString;
                continue;
            }

            if (inString)
            {
                continue;
            }

            if (c == '{')
            {
                if (depth == 0)
                {
                    start = i;
                }
                depth++;
                continue;
            }

            if (c == '}')
            {
                if (depth == 0)
                {
                    continue;
                }

                depth--;
                if (depth == 0 && start >= 0)
                {
                    yield return content[start..(i + 1)];
                    start = -1;
                }
            }
        }
    }

    private static AnalyzeResponse? TryParseFromAllJsonObjects(string content)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        foreach (var json in ExtractCompleteJsonObjects(content))
        {
            try
            {
                var candidate = JsonSerializer.Deserialize<AnalyzeResponse>(json, options);
                if (candidate != null)
                {
                    return candidate;
                }
            }
            catch (JsonException)
            {
                // 忽略无效候选，继续尝试后续完整对象
            }
        }

        return null;
    }
}
