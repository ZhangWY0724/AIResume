using System.Net;
using System.Net.Http.Headers;
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
/// GPT-5.2 客户端实现（OpenAI 兼容 Chat Completions）
/// </summary>
public class Gpt54AIClient : IGpt54AIClient, IAIClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<Gpt54AIClient> _logger;
    private readonly Gpt54AIOptions _options;
    private readonly JsonSerializerOptions _jsonOptions;

    public Gpt54AIClient(
        HttpClient httpClient,
        IOptions<Gpt54AIOptions> options,
        ILogger<Gpt54AIClient> logger)
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
        var request = new Gpt54ChatRequest
        {
            Model = _options.Model,
            Stream = false,
            Messages = new List<Gpt54Message>
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
            _logger.LogError(ex, "调用 GPT-5.2 API 失败");
            throw;
        }

        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds;
            _logger.LogWarning("GPT-5.2 请求频率超限 (429)，建议等待 {RetryAfter} 秒后重试", retryAfter);
            throw new AIRateLimitException(
                "AI 服务请求过于频繁，请稍后重试",
                retryAfter.HasValue ? (int)retryAfter.Value : 30);
        }

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<Gpt54ChatResponse>(_jsonOptions, cancellationToken);
        var content = result?.Choices?.FirstOrDefault()?.Message?.Content;

        if (!string.IsNullOrWhiteSpace(content))
        {
            _logger.LogDebug("GPT-5.2 响应成功，长度: {Length}", content.Length);
            return content;
        }

        _logger.LogWarning("GPT-5.2 响应格式异常或内容为空");
        return string.Empty;
    }

    public async IAsyncEnumerable<string> ChatStreamAsync(
        string systemPrompt,
        string userMessage,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = new Gpt54ChatRequest
        {
            Model = _options.Model,
            Stream = true,
            Messages = new List<Gpt54Message>
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
            _logger.LogError(ex, "调用 GPT-5.2 流式 API 失败");
            throw;
        }

        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds;
            _logger.LogWarning("GPT-5.2 流式请求频率超限 (429)，建议等待 {RetryAfter} 秒后重试", retryAfter);
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
            {
                continue;
            }

            line = line.Trim();
            if (!line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var data = line[5..].Trim();
            if (string.IsNullOrEmpty(data))
            {
                continue;
            }

            if (data == "[DONE]")
            {
                break;
            }

            Gpt54StreamResponse? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<Gpt54StreamResponse>(data, _jsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "解析 GPT-5.2 流式响应失败: {Data}", data);
                continue;
            }

            var content = chunk?.Choices?.FirstOrDefault()?.Delta?.Content;
            if (!string.IsNullOrEmpty(content))
            {
                yield return content;
            }
        }
    }

    private HttpRequestMessage BuildRequest(Gpt54ChatRequest request)
    {
        var endpoint = ResolveChatCompletionsEndpoint(_options.BaseUrl);
        var json = JsonSerializer.Serialize(request, _jsonOptions);

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }

        return httpRequest;
    }

    private static string ResolveChatCompletionsEndpoint(string baseUrl)
    {
        var normalized = (baseUrl ?? string.Empty).Trim().TrimEnd('/').ToLowerInvariant();
        return normalized.EndsWith("/v1", StringComparison.Ordinal)
            ? "chat/completions"
            : "v1/chat/completions";
    }
}

#region 请求/响应模型

internal class Gpt54ChatRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "gpt-5.2";

    [JsonPropertyName("messages")]
    public List<Gpt54Message> Messages { get; set; } = new();

    [JsonPropertyName("stream")]
    public bool Stream { get; set; }
}

internal class Gpt54Message
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

internal class Gpt54ChatResponse
{
    [JsonPropertyName("choices")]
    public List<Gpt54Choice>? Choices { get; set; }
}

internal class Gpt54Choice
{
    [JsonPropertyName("message")]
    public Gpt54Message? Message { get; set; }
}

internal class Gpt54StreamResponse
{
    [JsonPropertyName("choices")]
    public List<Gpt54StreamChoice>? Choices { get; set; }
}

internal class Gpt54StreamChoice
{
    [JsonPropertyName("delta")]
    public Gpt54Delta? Delta { get; set; }
}

internal class Gpt54Delta
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }
}

#endregion
