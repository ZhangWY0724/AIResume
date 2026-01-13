using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;

namespace ResumeAlchemist.Infrastructure.AI;

/// <summary>
/// 智谱 AI 客户端实现
/// </summary>
public class ZhipuAIClient : IZhipuAIClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ZhipuAIClient> _logger;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly JsonSerializerOptions _jsonOptions;

    public ZhipuAIClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ZhipuAIClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["ZhipuAI:ApiKey"] ?? throw new ArgumentNullException("ZhipuAI:ApiKey not configured");
        _model = configuration["ZhipuAI:Model"] ?? "glm-4";
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };
    }

    public async Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default)
    {
        var request = new ZhipuChatRequest
        {
            Model = _model,
            Messages = new List<ZhipuMessage>
            {
                new() { Role = "system", Content = systemPrompt },
                new() { Role = "user", Content = userMessage }
            },
            Thinking = new ZhipuThinking { Type = "disabled" }
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");

        try
        {
            var response = await _httpClient.PostAsJsonAsync("chat/completions", request, cancellationToken);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<ZhipuChatResponse>(cancellationToken: cancellationToken);

            if (result?.Choices?.FirstOrDefault()?.Message?.Content is string content)
            {
                _logger.LogDebug("AI 响应成功，长度: {Length}", content.Length);
                return content;
            }

            _logger.LogWarning("AI 响应格式异常");
            return string.Empty;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用智谱 AI API 失败");
            throw;
        }
    }

    public async IAsyncEnumerable<string> ChatStreamAsync(
        string systemPrompt,
        string userMessage,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = new ZhipuChatRequest
        {
            Model = _model,
            Stream = true,
            Messages = new List<ZhipuMessage>
            {
                new() { Role = "system", Content = systemPrompt },
                new() { Role = "user", Content = userMessage }
            },
            Thinking = new ZhipuThinking { Type = "disabled" }
        };

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");

        var jsonContent = JsonSerializer.Serialize(request, _jsonOptions);
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用智谱 AI 流式 API 失败");
            throw;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(line)) continue;

            line = line.Trim();

            // SSE 格式: data: {...}
            if (!line.StartsWith("data:")) continue;

            var data = line[5..].Trim();
            
            // 智谱/OpenAI 结束标志
            if (data == "[DONE]") break;

            ZhipuStreamResponse? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<ZhipuStreamResponse>(data);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "解析流式响应失败: {Data}", data);
                continue;
            }

            var content = chunk?.Choices?.FirstOrDefault()?.Delta?.GetEffectiveContent();
            if (!string.IsNullOrEmpty(content))
            {
                yield return content;
            }
        }
    }
}

#region 请求/响应模型

internal class ZhipuChatRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "glm-4";

    [JsonPropertyName("messages")]
    public List<ZhipuMessage> Messages { get; set; } = new();

    [JsonPropertyName("stream")]
    public bool Stream { get; set; } = false;

    [JsonPropertyName("thinking")]
    public ZhipuThinking? Thinking { get; set; }
}

internal class ZhipuThinking
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "disabled";
}

internal class ZhipuMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

internal class ZhipuChatResponse
{
    [JsonPropertyName("choices")]
    public List<ZhipuChoice>? Choices { get; set; }
}

internal class ZhipuChoice
{
    [JsonPropertyName("message")]
    public ZhipuMessage? Message { get; set; }

    [JsonPropertyName("delta")]
    public ZhipuDelta? Delta { get; set; }
}

internal class ZhipuDelta
{
    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("reasoning_content")]
    public string? ReasoningContent { get; set; }

    /// <summary>
    /// 获取有效内容（优先返回 content，其次返回 reasoning_content）
    /// </summary>
    public string? GetEffectiveContent() => Content ?? ReasoningContent;
}

internal class ZhipuStreamResponse
{
    [JsonPropertyName("choices")]
    public List<ZhipuStreamChoice>? Choices { get; set; }
}

internal class ZhipuStreamChoice
{
    [JsonPropertyName("delta")]
    public ZhipuDelta? Delta { get; set; }
}

#endregion
