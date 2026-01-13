using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.Constants;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// 简历润色服务实现
/// </summary>
public class ResumePolisherService : IResumePolisherService
{
    private readonly IZhipuAIClient _aiClient;
    private readonly ILogger<ResumePolisherService> _logger;

    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public ResumePolisherService(IZhipuAIClient aiClient, ILogger<ResumePolisherService> logger)
    {
        _aiClient = aiClient;
        _logger = logger;
    }

    public async Task<PolishResponse> PolishAsync(PolishRequest request, CancellationToken cancellationToken = default)
    {
        // ... (keep non-stream logic or update if needed, but for now we focus on stream)
        // Since we changed the prompt to non-JSON, this method will fail if we don't handle it.
        // For simplicity, let's assume this method is not used by the new frontend, or we should update it to parse the new format too.
        // But to save time, let's focus on PolishStreamAsync which is what we use.
        
        // Actually, to avoid breaking legacy calls, we should probably use a DIFFERENT prompt for non-stream if we want to keep it working.
        // But since we are refactoring, let's just make the stream working.
        
        _logger.LogInformation("开始润色简历 (非流式)，行业: {IndustryId}", request.IndustryId);
        
        // Temporary fallback: for non-stream, we might need to parse the custom format too, 
        // OR we can just return a dummy response if the frontend only uses stream now.
        // Let's implement a basic parser for the new format if needed.
        // But for now, let's just return a placeholder or throw not implemented if not used.
        // Or better: Use the same prompt and parse the full text at the end.
        
        var systemPrompt = PolishPrompts.GetSystemPrompt(request.IndustryId, request.TargetPosition);
        var userMessage = $"请润色以下简历：\n\n{request.Content}";

        var content = await _aiClient.ChatAsync(systemPrompt, userMessage, cancellationToken);
        
        // Simple parsing of the custom format
        var response = new PolishResponse();
        var lines = content.Split('\n');
        var currentSection = "";
        var contentBuilder = new StringBuilder();
        
        foreach (var line in lines)
        {
            if (line.StartsWith("[SUMMARY]"))
            {
                response.Summary = line.Substring("[SUMMARY]".Length).Trim();
                currentSection = "SUMMARY";
            }
            else if (line.StartsWith("[CHANGE]"))
            {
                var json = line.Substring("[CHANGE]".Length).Trim();
                try 
                {
                    var change = JsonSerializer.Deserialize<PolishChange>(json, _jsonOptions);
                    if (change != null) response.Changes.Add(change);
                }
                catch { /* ignore bad json */ }
                currentSection = "CHANGE";
            }
            else if (line.StartsWith("[CONTENT]"))
            {
                currentSection = "CONTENT";
            }
            else if (currentSection == "CONTENT")
            {
                contentBuilder.AppendLine(line);
            }
        }
        response.PolishedContent = contentBuilder.ToString().Trim();
        
        return response;
    }

    public async IAsyncEnumerable<PolishStreamEvent> PolishStreamAsync(
        PolishRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("开始流式润色简历 (多事件流)，行业: {IndustryId}", request.IndustryId);

        var systemPrompt = PolishPrompts.GetSystemPrompt(request.IndustryId, request.TargetPosition);
        var userMessage = $"请润色以下简历：\n\n{request.Content}";

        var buffer = new StringBuilder();
        var currentMode = "UNKNOWN"; // UNKNOWN, SUMMARY, CHANGE, CONTENT

        await foreach (var chunk in _aiClient.ChatStreamAsync(systemPrompt, userMessage, cancellationToken))
        {
            // If we are in CONTENT mode, we just stream everything as chunks
            if (currentMode == "CONTENT")
            {
                yield return new PolishStreamEvent { Type = PolishEventType.ContentChunk, Data = chunk };
                continue;
            }

            // Otherwise, we accumulate buffer to parse lines
            buffer.Append(chunk);
            
            // Process complete lines
            while (true)
            {
                var str = buffer.ToString();
                var newlineIndex = str.IndexOf('\n');
                if (newlineIndex == -1) break;

                var line = str.Substring(0, newlineIndex).Trim();
                buffer.Remove(0, newlineIndex + 1);

                if (string.IsNullOrWhiteSpace(line)) continue;

                if (line.StartsWith("[SUMMARY]"))
                {
                    currentMode = "SUMMARY";
                    var summary = line.Substring("[SUMMARY]".Length).Trim();
                    yield return new PolishStreamEvent { Type = PolishEventType.Summary, Data = summary };
                }
                else if (line.StartsWith("[CHANGE]"))
                {
                    currentMode = "CHANGE";
                    var json = line.Substring("[CHANGE]".Length).Trim();
                    PolishChange? change = null;
                    try
                    {
                        change = JsonSerializer.Deserialize<PolishChange>(json, _jsonOptions);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("Failed to parse change JSON: {Json}, Error: {Error}", json, ex.Message);
                    }

                    if (change != null)
                    {
                        yield return new PolishStreamEvent { Type = PolishEventType.Change, Data = change };
                    }
                }
                else if (line.StartsWith("[CONTENT]"))
                {
                    currentMode = "CONTENT";
                    // If there is any remaining buffer, it belongs to content
                    if (buffer.Length > 0)
                    {
                        yield return new PolishStreamEvent { Type = PolishEventType.ContentChunk, Data = buffer.ToString() };
                        buffer.Clear();
                    }
                }
            }
        }
        
        // Flush remaining buffer if not in content mode (unlikely but possible)
        if (buffer.Length > 0 && currentMode == "CONTENT")
        {
             yield return new PolishStreamEvent { Type = PolishEventType.ContentChunk, Data = buffer.ToString() };
        }

        _logger.LogInformation("流式润色完成");
    }
}
