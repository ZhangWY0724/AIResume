using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// JSON 解析辅助类
/// </summary>
public static class JsonHelper
{
    private static readonly JsonSerializerOptions _options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// 尝试解析 AI 返回的 JSON 响应
    /// </summary>
    public static T? ParseAIResponse<T>(string content, ILogger logger) where T : class
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            logger.LogWarning("AI 响应内容为空");
            return null;
        }

        // 尝试清理可能的 markdown 代码块
        var cleanedContent = CleanJsonContent(content);

        try
        {
            return JsonSerializer.Deserialize<T>(cleanedContent, _options);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "JSON 解析失败，原始内容: {Content}", content);
            return null;
        }
    }

    /// <summary>
    /// 清理 JSON 内容（移除 markdown 代码块等）
    /// </summary>
    private static string CleanJsonContent(string content)
    {
        var result = content.Trim();

        // 移除 ```json 和 ``` 包裹
        if (result.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            result = result[7..];
        }
        else if (result.StartsWith("```"))
        {
            result = result[3..];
        }

        if (result.EndsWith("```"))
        {
            result = result[..^3];
        }

        return result.Trim();
    }
}
