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
        var userMessage = AnalyzePrompts.GetUserPrompt(request.Content, request.IndustryId);

        var aiClient = _aiClientFactory.GetClient(request.ModelType);
        var aiResponse = await aiClient.ChatAsync(systemPrompt, userMessage, cancellationToken);

        var result = TryParseFromAllJsonObjects(aiResponse) ?? JsonHelper.ParseAIResponse<AnalyzeResponse>(aiResponse, _logger);

        // 非流式请求下，如果返回结构过于稀疏，补发一次强化约束请求，尽量拿到完整结果
        if (result == null || IsSparseResult(result))
        {
            _logger.LogWarning("首次分析结果为空或字段稀疏，触发一次非流式重试");

            var retryMessage = userMessage + @"

重要约束（必须遵守）：
1) 必须返回完整 JSON；
2) dimensions 必须返回，且至少覆盖 5 个维度；
3) strengths / improvements / missingKeywords 不能全部为空；
4) atsScore 必须是 1-100 的整数。";

            var retryResponse = await aiClient.ChatAsync(systemPrompt, retryMessage, cancellationToken);
            var retryResult = TryParseFromAllJsonObjects(retryResponse) ?? JsonHelper.ParseAIResponse<AnalyzeResponse>(retryResponse, _logger);

            if (retryResult != null && GetCompletenessScore(retryResult) >= GetCompletenessScore(result))
            {
                result = retryResult;
            }
        }

        if (result == null)
        {
            _logger.LogWarning("AI 响应解析失败，返回默认响应");
            result = BuildFallbackResponse();
        }

        result = NormalizeAnalyzeResponse(result, request);

        // 确保等级正确
        result.Level = ScoreLevel.GetLevel(result.Score);
        result.IndustryFitScore = ResolveIndustryFitScore(result, request.IndustryId);

        _logger.LogInformation("简历分析完成，评分: {Score}, 等级: {Level}", result.Score, result.Level);
        return result;
    }

    public async IAsyncEnumerable<string> AnalyzeStreamAsync(
        AnalyzeRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始流式分析简历，行业: {IndustryId}, 模型: {ModelType}", request.IndustryId, request.ModelType);

        var systemPrompt = AnalyzePrompts.GetSystemPrompt(request.IndustryId);
        var userMessage = AnalyzePrompts.GetUserPrompt(request.Content, request.IndustryId);

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
        AnalyzeResponse? best = null;
        var bestScore = -1;

        foreach (var json in ExtractCompleteJsonObjects(content))
        {
            try
            {
                var candidate = JsonSerializer.Deserialize<AnalyzeResponse>(json, options);
                if (candidate != null)
                {
                    var score = GetCompletenessScore(candidate);
                    if (score > bestScore)
                    {
                        best = candidate;
                        bestScore = score;
                    }
                }
            }
            catch (JsonException)
            {
                // 忽略无效候选，继续尝试后续完整对象
            }
        }

        return best;
    }

    private static int GetCompletenessScore(AnalyzeResponse? result)
    {
        if (result == null)
        {
            return -1;
        }

        var score = 0;
        score += result.Dimensions?.Count * 4 ?? 0;
        score += result.Strengths?.Count * 2 ?? 0;
        score += result.Improvements?.Count * 3 ?? 0;
        score += result.MissingKeywords?.Count ?? 0;
        score += !string.IsNullOrWhiteSpace(result.Comment) ? 2 : 0;
        score += result.AtsScore > 0 ? 2 : 0;
        return score;
    }

    private static bool IsSparseResult(AnalyzeResponse result)
    {
        return GetCompletenessScore(result) < 10;
    }

    private static AnalyzeResponse BuildFallbackResponse()
    {
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

    private static AnalyzeResponse NormalizeAnalyzeResponse(AnalyzeResponse result, AnalyzeRequest request)
    {
        var industryConfig = IndustryConfigs.Get(request.IndustryId);
        result.Score = result.Score <= 0 ? 60 : Math.Clamp(result.Score, 0, 100);
        result.Comment = string.IsNullOrWhiteSpace(result.Comment) ? "已完成分析，请结合目标岗位要求进一步优化。" : result.Comment.Trim();

        result.Dimensions ??= new List<DimensionScore>();
        if (result.Dimensions.Count == 0)
        {
            var baseScore = Math.Clamp(result.Score - 5, 0, 100);
            result.Dimensions = industryConfig.Dimensions
                .Select(d => new DimensionScore
                {
                    Name = d,
                    Score = baseScore,
                    Comment = "该维度信息不足，建议补充相关经历与可量化成果。"
                })
                .ToList();
        }

        result.Strengths ??= new List<string>();
        if (result.Strengths.Count == 0)
        {
            result.Strengths.Add("求职目标明确，建议围绕目标岗位补充可量化经历。");
        }

        result.Improvements ??= new List<ImprovementItem>();
        if (result.Improvements.Count == 0)
        {
            result.Improvements.Add(new ImprovementItem
            {
                Problem = "缺少与目标岗位相关的成果化表达",
                Original = "N/A",
                Example = "补充 2-3 段岗位相关实践，并使用数字量化结果（如完成率、提升比例、满意度等）。"
            });
        }

        var detectedMissing = DetectMissingKeywords(request.Content, industryConfig.Keywords);
        result.MissingKeywords = (result.MissingKeywords ?? new List<string>())
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Select(k => k.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (result.MissingKeywords.Count == 0)
        {
            result.MissingKeywords = detectedMissing.Take(12).ToList();
        }

        if (result.AtsScore <= 0)
        {
            var totalKeywords = Math.Max(1, industryConfig.Keywords.Length);
            var missingCount = Math.Min(totalKeywords, result.MissingKeywords.Count);
            var keywordCoverage = (int)Math.Round((1 - (double)missingCount / totalKeywords) * 100, MidpointRounding.AwayFromZero);
            var estimatedAts = (int)Math.Round((result.Score * 0.4) + (keywordCoverage * 0.6), MidpointRounding.AwayFromZero);
            result.AtsScore = Math.Clamp(estimatedAts, 20, 95);
        }

        return result;
    }

    private static List<string> DetectMissingKeywords(string content, string[] keywords)
    {
        if (string.IsNullOrWhiteSpace(content) || keywords.Length == 0)
        {
            return keywords.ToList();
        }

        var normalized = content.ToLowerInvariant();
        return keywords
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Where(k => !normalized.Contains(k.ToLowerInvariant()))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static int ResolveIndustryFitScore(AnalyzeResponse result, string industryId)
    {
        // AI 已返回合法分数时优先使用
        if (result.IndustryFitScore is > 0 and <= 100)
        {
            return result.IndustryFitScore;
        }

        var industryConfig = IndustryConfigs.Get(industryId);
        var totalKeywords = industryConfig.Keywords.Length;
        if (totalKeywords == 0)
        {
            return Math.Clamp(result.AtsScore, 0, 100);
        }

        var keywordSet = new HashSet<string>(industryConfig.Keywords, StringComparer.OrdinalIgnoreCase);
        var missingCount = result.MissingKeywords?.Count(keywordSet.Contains) ?? 0;
        var keywordCoverage = (int)Math.Round((1 - (double)missingCount / totalKeywords) * 100, MidpointRounding.AwayFromZero);

        // 关键词覆盖更能代表行业匹配度，给更高权重
        var blended = (int)Math.Round((keywordCoverage * 0.7) + (Math.Clamp(result.AtsScore, 0, 100) * 0.3), MidpointRounding.AwayFromZero);
        return Math.Clamp(blended, 0, 100);
    }
}
