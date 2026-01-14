using System.Net;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Exceptions;
using ResumeAlchemist.Core.Interfaces;

namespace ResumeAlchemist.Infrastructure.AI;

/// <summary>
/// Gemini AI 客户端实现
/// </summary>
public class GeminiAIClient : IGeminiAIClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GeminiAIClient> _logger;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly string _baseUrl;
    private readonly JsonSerializerOptions _jsonOptions;

    public GeminiAIClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiAIClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["GeminiAI:ApiKey"] ?? throw new ArgumentNullException("GeminiAI:ApiKey not configured");
        _model = configuration["GeminiAI:Model"] ?? "claude-haiku-4-5-20251001";
        _baseUrl = configuration["GeminiAI:BaseUrl"] ?? "http://47.83.126.41:8317";
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    public async Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default)
    {
        var request = new GeminiRequest
        {
            Contents = new List<GeminiContent>
            {
                new()
                {
                    Parts = new List<GeminiPart>
                    {
                        new() { Text = $"{systemPrompt}\n\n{userMessage}" }
                    }
                }
            }
        };

        var url = $"{_baseUrl}/v1beta/models/{_model}:generateContent";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Headers.Add("x-goog-api-key", _apiKey);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(request, _jsonOptions),
            Encoding.UTF8,
            "application/json");

        try
        {
            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds;
                _logger.LogWarning("Gemini AI 服务请求频率超限 (429)，建议等待 {RetryAfter} 秒后重试", retryAfter);
                throw new AIRateLimitException(
                    "AI 服务请求过于频繁，请稍后重试",
                    retryAfter.HasValue ? (int)retryAfter.Value : 30);
            }

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>(cancellationToken: cancellationToken);

            if (result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text is string content)
            {
                _logger.LogDebug("Gemini AI 响应成功，长度: {Length}", content.Length);
                return content;
            }

            _logger.LogWarning("Gemini AI 响应格式异常");
            return string.Empty;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用 Gemini AI API 失败");
            throw;
        }
    }

    public async IAsyncEnumerable<string> ChatStreamAsync(
        string systemPrompt,
        string userMessage,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = new GeminiRequest
        {
            Contents = new List<GeminiContent>
            {
                new()
                {
                    Parts = new List<GeminiPart>
                    {
                        new() { Text = $"{systemPrompt}\n\n{userMessage}" }
                    }
                }
            }
        };

        var url = $"{_baseUrl}/v1beta/models/{_model}:streamGenerateContent";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
        httpRequest.Headers.Add("x-goog-api-key", _apiKey);
        httpRequest.Content = new StringContent(
            JsonSerializer.Serialize(request, _jsonOptions),
            Encoding.UTF8,
            "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds;
                _logger.LogWarning("Gemini AI 流式服务请求频率超限 (429)，建议等待 {RetryAfter} 秒后重试", retryAfter);
                throw new AIRateLimitException(
                    "AI 服务请求过于频繁，请稍后重试",
                    retryAfter.HasValue ? (int)retryAfter.Value : 30);
            }

            response.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用 Gemini AI 流式 API 失败");
            throw;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream)
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            var line = await reader.ReadLineAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(line))
                continue;

            // 处理 SSE 格式: data: {...}
            if (line.StartsWith("data: "))
            {
                var jsonData = line.Substring(6).Trim();

                if (string.IsNullOrEmpty(jsonData) || jsonData == "[DONE]")
                    continue;

                GeminiResponse? chunk = null;
                try
                {
                    chunk = JsonSerializer.Deserialize<GeminiResponse>(jsonData, _jsonOptions);
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "解析 Gemini 流式响应 JSON 失败: {Data}", jsonData);
                    continue;
                }

                var text = chunk?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                if (!string.IsNullOrEmpty(text))
                {
                    yield return text;
                }
            }
        }
    }
}

#region 请求/响应模型

internal class GeminiRequest
{
    [JsonPropertyName("contents")]
    public List<GeminiContent> Contents { get; set; } = new();
}

internal class GeminiContent
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("parts")]
    public List<GeminiPart> Parts { get; set; } = new();
}

internal class GeminiPart
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("thoughtSignature")]
    public string? ThoughtSignature { get; set; }
}

internal class GeminiResponse
{
    [JsonPropertyName("candidates")]
    public List<GeminiCandidate>? Candidates { get; set; }

    [JsonPropertyName("usageMetadata")]
    public GeminiUsageMetadata? UsageMetadata { get; set; }

    [JsonPropertyName("modelVersion")]
    public string? ModelVersion { get; set; }

    [JsonPropertyName("responseId")]
    public string? ResponseId { get; set; }
}

internal class GeminiCandidate
{
    [JsonPropertyName("content")]
    public GeminiContent? Content { get; set; }

    [JsonPropertyName("finishReason")]
    public string? FinishReason { get; set; }
}

internal class GeminiUsageMetadata
{
    [JsonPropertyName("promptTokenCount")]
    public int PromptTokenCount { get; set; }

    [JsonPropertyName("candidatesTokenCount")]
    public int CandidatesTokenCount { get; set; }

    [JsonPropertyName("totalTokenCount")]
    public int TotalTokenCount { get; set; }

    [JsonPropertyName("thoughtsTokenCount")]
    public int ThoughtsTokenCount { get; set; }
}

#endregion
