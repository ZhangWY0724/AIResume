using System.Net;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ResumeAlchemist.Core.Exceptions;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Options;

namespace ResumeAlchemist.Infrastructure.AI;

/// <summary>
/// Kilo AI 客户端实现（OpenAI 兼容 Chat Completions）
/// </summary>
public class KiloAIClient : IKiloAIClient, IAIClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<KiloAIClient> _logger;
    private readonly KiloAIOptions _options;
    private readonly JsonSerializerOptions _jsonOptions;

    public KiloAIClient(
        HttpClient httpClient,
        IOptions<KiloAIOptions> options,
        ILogger<KiloAIClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };
    }

    public async Task<string> ChatAsync(
        string systemPrompt,
        string userMessage,
        CancellationToken cancellationToken = default)
    {
        var request = new KiloChatRequest
        {
            Model = _options.Model,
            Stream = false,
            Messages = new List<KiloMessage>
            {
                new() { Role = "system", Content = systemPrompt },
                new() { Role = "user", Content = userMessage }
            }
        };

        using var httpRequest = BuildRequest(request);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用 Kilo AI API 失败");
            throw;
        }

        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds;
            _logger.LogWarning("Kilo AI 请求频率超限 (429)，建议等待 {RetryAfter} 秒后重试", retryAfter);
            throw new AIRateLimitException(
                "AI 服务请求过于频繁，请稍后重试",
                retryAfter.HasValue ? (int)retryAfter.Value : 30);
        }

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<KiloChatResponse>(_jsonOptions, cancellationToken);
        var content = result?.Choices?.FirstOrDefault()?.Message?.Content;

        if (!string.IsNullOrWhiteSpace(content))
        {
            _logger.LogDebug("Kilo AI 响应成功，长度: {Length}", content.Length);
            return content;
        }

        _logger.LogWarning("Kilo AI 响应格式异常或内容为空");
        return string.Empty;
    }

    public async IAsyncEnumerable<string> ChatStreamAsync(
        string systemPrompt,
        string userMessage,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = new KiloChatRequest
        {
            Model = _options.Model,
            Stream = true,
            Messages = new List<KiloMessage>
            {
                new() { Role = "system", Content = systemPrompt },
                new() { Role = "user", Content = userMessage }
            }
        };

        using var httpRequest = BuildRequest(request);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用 Kilo AI 流式 API 失败");
            throw;
        }

        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds;
            _logger.LogWarning("Kilo AI 流式请求频率超限 (429)，建议等待 {RetryAfter} 秒后重试", retryAfter);
            throw new AIRateLimitException(
                "AI 服务请求过于频繁，请稍后重试",
                retryAfter.HasValue ? (int)retryAfter.Value : 30);
        }

        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line))
                continue;

            line = line.Trim();

            // SSE 格式: data: {...}
            if (!line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                continue;

            var data = line[5..].Trim();
            if (string.IsNullOrEmpty(data))
                continue;

            if (data == "[DONE]")
                break;

            KiloStreamResponse? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<KiloStreamResponse>(data, _jsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "解析 Kilo 流式响应失败: {Data}", data);
                continue;
            }

            var content = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(content))
            {
                yield return content;
            }
        }
    }

    private HttpRequestMessage BuildRequest(KiloChatRequest request)
    {
        var json = JsonSerializer.Serialize(request, _jsonOptions);

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        httpRequest.Headers.Add("Authorization", $"Bearer {_options.ApiKey}");
        return httpRequest;
    }
}

#region 请求/响应模型

internal class KiloChatRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "kilo/auto-free";

    [JsonPropertyName("messages")]
    public List<KiloMessage> Messages { get; set; } = new();

    [JsonPropertyName("stream")]
    public bool Stream { get; set; }
}

internal class KiloMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

internal class KiloChatResponse
{
    [JsonPropertyName("choices")]
    public List<KiloChoice>? Choices { get; set; }
}

internal class KiloChoice
{
    [JsonPropertyName("message")]
    public KiloMessage? Message { get; set; }
}

internal class KiloStreamResponse
{
    [JsonPropertyName("choices")]
    public List<KiloStreamChoice>? Choices { get; set; }
}

internal class KiloStreamChoice
{
    [JsonPropertyName("delta")]
    public KiloDelta? Delta { get; set; }
}

internal class KiloDelta
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}

#endregion
