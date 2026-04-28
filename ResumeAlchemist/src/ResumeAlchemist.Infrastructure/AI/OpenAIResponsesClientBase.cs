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
using ResumeAlchemist.Core.Exceptions;
using ResumeAlchemist.Core.Interfaces;

namespace ResumeAlchemist.Infrastructure.AI;

/// <summary>
/// OpenAI Responses API 兼容客户端基类
/// </summary>
public abstract class OpenAIResponsesClientBase : IAIClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    protected OpenAIResponsesClientBase(HttpClient httpClient, ILogger logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };
    }

    protected abstract string ProviderName { get; }

    protected abstract string Model { get; }

    protected abstract string ApiKey { get; }

    public async Task<string> ChatAsync(
        string systemPrompt,
        string userMessage,
        CancellationToken cancellationToken = default)
    {
        var request = new OpenAIResponsesRequest
        {
            Model = Model,
            Stream = false,
            Input = BuildInput(systemPrompt, userMessage)
        };

        using var httpRequest = BuildRequest(request);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用 {ProviderName} API 失败", ProviderName);
            throw;
        }

        await EnsureSuccessStatusCodeAsync(response);

        var result = await response.Content.ReadFromJsonAsync<OpenAIResponsesApiResponse>(_jsonOptions, cancellationToken);
        var content = ExtractOutputText(result);

        if (!string.IsNullOrWhiteSpace(content))
        {
            _logger.LogDebug("{ProviderName} 响应成功，长度: {Length}", ProviderName, content.Length);
            return content;
        }

        _logger.LogWarning("{ProviderName} 响应格式异常或内容为空", ProviderName);
        return string.Empty;
    }

    public async IAsyncEnumerable<string> ChatStreamAsync(
        string systemPrompt,
        string userMessage,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var request = new OpenAIResponsesRequest
        {
            Model = Model,
            Stream = true,
            Input = BuildInput(systemPrompt, userMessage)
        };

        using var httpRequest = BuildRequest(request);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "调用 {ProviderName} 流式 API 失败", ProviderName);
            throw;
        }

        await EnsureSuccessStatusCodeAsync(response);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line is null)
            {
                break;
            }

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

            OpenAIResponsesStreamEvent? chunk;
            try
            {
                chunk = JsonSerializer.Deserialize<OpenAIResponsesStreamEvent>(data, _jsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "解析 {ProviderName} 流式响应失败: {Data}", ProviderName, data);
                continue;
            }

            if (string.Equals(chunk?.Type, "response.completed", StringComparison.OrdinalIgnoreCase))
            {
                break;
            }

            var delta = chunk?.Delta;
            if (string.Equals(chunk?.Type, "response.output_text.delta", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrEmpty(delta))
            {
                yield return delta;
            }
        }
    }

    private HttpRequestMessage BuildRequest(OpenAIResponsesRequest request)
    {
        var json = JsonSerializer.Serialize(request, _jsonOptions);

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "responses")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(ApiKey))
        {
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
        }

        return httpRequest;
    }

    private async Task EnsureSuccessStatusCodeAsync(HttpResponseMessage response)
    {
        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds;
            _logger.LogWarning("{ProviderName} 请求频率超限 (429)，建议等待 {RetryAfter} 秒后重试", ProviderName, retryAfter);
            throw new AIRateLimitException(
                "AI 服务请求过于频繁，请稍后重试",
                retryAfter.HasValue ? (int)retryAfter.Value : 30);
        }

        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var errorBody = await response.Content.ReadAsStringAsync();
        _logger.LogWarning("{ProviderName} 请求失败，状态码: {StatusCode}，响应: {ResponseBody}",
            ProviderName,
            (int)response.StatusCode,
            errorBody);

        response.EnsureSuccessStatusCode();
    }

    private static List<OpenAIResponsesInputMessage> BuildInput(string systemPrompt, string userMessage)
    {
        return new List<OpenAIResponsesInputMessage>
        {
            CreateInputMessage("system", systemPrompt),
            CreateInputMessage("user", userMessage)
        };
    }

    private static OpenAIResponsesInputMessage CreateInputMessage(string role, string text)
    {
        return new OpenAIResponsesInputMessage
        {
            Role = role,
            Content = new List<OpenAIResponsesInputContent>
            {
                new() { Text = text }
            }
        };
    }

    private static string ExtractOutputText(OpenAIResponsesApiResponse? response)
    {
        if (response?.Output is null)
        {
            return string.Empty;
        }

        return string.Concat(response.Output
            .Where(item => string.Equals(item.Type, "message", StringComparison.OrdinalIgnoreCase))
            .SelectMany(item => item.Content ?? Enumerable.Empty<OpenAIResponsesOutputContent>())
            .Where(content => string.Equals(content.Type, "output_text", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(content.Text))
            .Select(content => content.Text));
    }
}

#region 请求/响应模型

internal class OpenAIResponsesRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("input")]
    public List<OpenAIResponsesInputMessage> Input { get; set; } = new();

    [JsonPropertyName("stream")]
    public bool Stream { get; set; }
}

internal class OpenAIResponsesInputMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public List<OpenAIResponsesInputContent> Content { get; set; } = new();
}

internal class OpenAIResponsesInputContent
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "input_text";

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

internal class OpenAIResponsesApiResponse
{
    [JsonPropertyName("output")]
    public List<OpenAIResponsesOutputItem>? Output { get; set; }
}

internal class OpenAIResponsesOutputItem
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public List<OpenAIResponsesOutputContent>? Content { get; set; }
}

internal class OpenAIResponsesOutputContent
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

internal class OpenAIResponsesStreamEvent
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("delta")]
    public string? Delta { get; set; }
}

#endregion
