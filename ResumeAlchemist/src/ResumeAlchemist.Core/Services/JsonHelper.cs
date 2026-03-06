using System.Text.Json;
using System.Text;
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
            // 常见 AI 输出问题：数组中的对象被错误地加了引号，例如：...},{"{ ... }...
            // 这里做一次“保守修复”后重试解析，避免因少量格式问题导致整体失败。
            var repaired = RepairCommonAiJsonIssues(cleanedContent);

            try
            {
                return JsonSerializer.Deserialize<T>(repaired, _options);
            }
            catch (JsonException retryEx)
            {
                logger.LogError(retryEx, "JSON 解析失败，原始内容: {Content}", content);
                return null;
            }
        }
    }

    /// <summary>
    /// 清理 JSON 内容（移除 markdown 代码块等）
    /// </summary>
    private static string CleanJsonContent(string content)
    {
        var result = content.Trim();

        // 移除 ```json 和 ``` 包裹（支持多种变体）
        if (result.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            result = result[7..];
        }
        else if (result.StartsWith("```JSON", StringComparison.Ordinal))
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

        result = result.Trim();

        // 尝试提取第一个 { 到最后一个 } 之间的内容
        var firstBrace = result.IndexOf('{');
        var lastBrace = result.LastIndexOf('}');

        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            result = result[firstBrace..(lastBrace + 1)];
        }

        return result;
    }

    /// <summary>
    /// 修复常见的 AI 输出 JSON 小问题（尽量不影响正常 JSON）。
    /// 当前主要针对：数组中对象前误加引号，例如：,"{ "name": ... }。
    /// </summary>
    private static string RepairCommonAiJsonIssues(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return json;
        }

        var sb = new StringBuilder(json.Length);
        var inString = false;
        var escaped = false;

        for (var i = 0; i < json.Length; i++)
        {
            var c = json[i];

            if (inString)
            {
                sb.Append(c);

                if (escaped)
                {
                    escaped = false;
                    continue;
                }

                if (c == '\\')
                {
                    escaped = true;
                    continue;
                }

                if (c == '"')
                {
                    inString = false;
                }

                continue;
            }

            if (c == '"')
            {
                var prevNonWs = FindPrevNonWhitespace(json, i - 1);
                var nextNonWs = FindNextNonWhitespace(json, i + 1);
                var nextAfterBrace = nextNonWs == '{'
                    ? FindNextNonWhitespace(json, FindNextNonWhitespaceIndex(json, i + 1) + 1)
                    : '\0';

                // 仅在“明显是对象起始”的情况下移除多余引号： (,[) " { "
                if ((prevNonWs == ',' || prevNonWs == '[') && nextNonWs == '{' && nextAfterBrace == '"')
                {
                    continue;
                }

                inString = true;
                sb.Append(c);
                continue;
            }

            sb.Append(c);
        }

        return sb.ToString();
    }

    private static char FindPrevNonWhitespace(string s, int startIndex)
    {
        for (var i = startIndex; i >= 0; i--)
        {
            var c = s[i];
            if (!char.IsWhiteSpace(c))
            {
                return c;
            }
        }
        return '\0';
    }

    private static int FindNextNonWhitespaceIndex(string s, int startIndex)
    {
        for (var i = startIndex; i < s.Length; i++)
        {
            if (!char.IsWhiteSpace(s[i]))
            {
                return i;
            }
        }
        return -1;
    }

    private static char FindNextNonWhitespace(string s, int startIndex)
    {
        var idx = FindNextNonWhitespaceIndex(s, startIndex);
        return idx >= 0 ? s[idx] : '\0';
    }
}
