using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
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

    public ZhipuAIClient(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ZhipuAIClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["ZhipuAI:ApiKey"] ?? throw new ArgumentNullException("ZhipuAI:ApiKey not configured");
        _model = configuration["ZhipuAI:Model"] ?? "glm-4";
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
            }
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
}

#region 请求/响应模型

internal class ZhipuChatRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "glm-4";

    [JsonPropertyName("messages")]
    public List<ZhipuMessage> Messages { get; set; } = new();
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
}

#endregion
