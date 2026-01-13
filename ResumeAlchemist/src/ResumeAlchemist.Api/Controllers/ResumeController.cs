using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Microsoft.AspNetCore.Mvc;
using ResumeAlchemist.Core.Exceptions;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Core.Services;
using ResumeAlchemist.Shared.Constants;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Api.Controllers;

/// <summary>
/// 简历相关 API 控制器
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ResumeController : ControllerBase
{
    private readonly IResumeAnalyzerService _analyzerService;
    private readonly IResumePolisherService _polisherService;
    private readonly IJDMatcherService _matcherService;
    private readonly IResumeParserService _parserService;
    private readonly IInterviewPredictorService _interviewService;
    private readonly ILogger<ResumeController> _logger;

    public ResumeController(
        IResumeAnalyzerService analyzerService,
        IResumePolisherService polisherService,
        IJDMatcherService matcherService,
        IResumeParserService parserService,
        IInterviewPredictorService interviewService,
        ILogger<ResumeController> logger)
    {
        _analyzerService = analyzerService;
        _polisherService = polisherService;
        _matcherService = matcherService;
        _parserService = parserService;
        _interviewService = interviewService;
        _logger = logger;
    }

    /// <summary>
    /// 简历分析
    /// </summary>
    /// <param name="request">分析请求</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>分析结果</returns>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(AnalyzeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AnalyzeResponse>> Analyze(
        [FromBody] AnalyzeRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { message = "简历内容不能为空" });
        }

        _logger.LogInformation("收到简历分析请求");
        var result = await _analyzerService.AnalyzeAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// 简历分析（SSE 流式响应）
    /// </summary>
    /// <param name="request">分析请求</param>
    /// <param name="cancellationToken">取消令牌</param>
    [HttpPost("analyze-stream")]
    public async Task AnalyzeStream(
        [FromBody] AnalyzeRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(new { message = "简历内容不能为空" }, cancellationToken);
            return;
        }

        _logger.LogInformation("收到简历流式分析请求");

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no");

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };
        var responseBuilder = new StringBuilder();
        var lastProgressSent = 0;

        try
        {
            // 发送开始事件
            await SendSseEvent("progress", new SseProgressData
            {
                Percentage = 0,
                Stage = "初始化",
                Message = "正在连接 AI 服务..."
            }, jsonOptions, cancellationToken);

            await SendSseEvent("progress", new SseProgressData
            {
                Percentage = 10,
                Stage = "分析中",
                Message = "AI 正在深度分析您的简历..."
            }, jsonOptions, cancellationToken);

            await foreach (var chunk in _analyzerService.AnalyzeStreamAsync(request, cancellationToken))
            {
                responseBuilder.Append(chunk);

                // 每收到一些内容就更新进度
                var estimatedProgress = Math.Min(90, 10 + (responseBuilder.Length / 50));
                if (estimatedProgress > lastProgressSent + 5)
                {
                    lastProgressSent = estimatedProgress;
                    await SendSseEvent("progress", new SseProgressData
                    {
                        Percentage = estimatedProgress,
                        Stage = "分析中",
                        Message = "正在生成分析报告..."
                    }, jsonOptions, cancellationToken);
                }

                // 发送原始内容片段
                await SendSseEvent("chunk", new { content = chunk }, jsonOptions, cancellationToken);
            }

            // 解析完整响应
            var fullResponse = responseBuilder.ToString();
            var result = JsonHelper.ParseAIResponse<AnalyzeResponse>(fullResponse, _logger);

            if (result == null)
            {
                await SendSseEvent("error", new SseErrorData
                {
                    Message = "AI 响应解析失败",
                    Code = "PARSE_ERROR"
                }, jsonOptions, cancellationToken);
                return;
            }

            // 确保等级正确
            result.Level = ScoreLevel.GetLevel(result.Score);

            // 发送完成事件
            await SendSseEvent("progress", new SseProgressData
            {
                Percentage = 100,
                Stage = "完成",
                Message = "分析完成！"
            }, jsonOptions, cancellationToken);

            await SendSseEvent("complete", result, jsonOptions, cancellationToken);

            _logger.LogInformation("流式分析完成，评分: {Score}", result.Score);
        }
        catch (Exception ex)
        {
            await HandleSseErrorAsync(ex, jsonOptions, cancellationToken);
        }
    }

    private async Task HandleSseErrorAsync(Exception ex, JsonSerializerOptions jsonOptions, CancellationToken cancellationToken)
    {
        if (ex is OperationCanceledException)
        {
            _logger.LogInformation("流式请求被取消");
            return;
        }

        var errorData = new SseErrorData
        {
            Code = "INTERNAL_ERROR",
            Message = "处理过程中发生错误，请重试"
        };

        if (ex is AIRateLimitException rateLimitEx)
        {
            _logger.LogWarning(ex, "流式请求遇到 AI 服务频率限制");
            errorData.Code = "RATE_LIMIT_EXCEEDED";
            errorData.Message = rateLimitEx.Message;
            errorData.RetryAfterSeconds = rateLimitEx.RetryAfterSeconds;
        }
        else
        {
            _logger.LogError(ex, "流式请求出错");
        }

        await SendSseEvent("error", errorData, jsonOptions, cancellationToken);
    }

    private async Task SendSseEvent<T>(string eventType, T data, JsonSerializerOptions options, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(data, options);
        await Response.WriteAsync($"event: {eventType}\n", cancellationToken);
        await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    /// <summary>
    /// 简历润色
    /// </summary>
    /// <param name="request">润色请求</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>润色结果</returns>
    [HttpPost("polish")]
    [ProducesResponseType(typeof(PolishResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PolishResponse>> Polish(
        [FromBody] PolishRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { message = "简历内容不能为空" });
        }

        _logger.LogInformation("收到简历润色请求");
        var result = await _polisherService.PolishAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// 简历润色（SSE 流式响应）
    /// </summary>
    /// <param name="request">润色请求</param>
    /// <param name="cancellationToken">取消令牌</param>
    [HttpPost("polish-stream")]
    public async Task PolishStream(
        [FromBody] PolishRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(new { message = "简历内容不能为空" }, cancellationToken);
            return;
        }

        _logger.LogInformation("收到简历流式润色请求");

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no");

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };
        var responseBuilder = new StringBuilder();
        var lastProgressSent = 0;

        try
        {
            // 发送开始事件
            await SendSseEvent("progress", new SseProgressData
            {
                Percentage = 0,
                Stage = "初始化",
                Message = "正在连接 AI 服务..."
            }, jsonOptions, cancellationToken);

            await SendSseEvent("progress", new SseProgressData
            {
                Percentage = 10,
                Stage = "润色中",
                Message = "AI 正在优化您的简历..."
            }, jsonOptions, cancellationToken);

            await foreach (var chunk in _polisherService.PolishStreamAsync(request, cancellationToken))
            {
                responseBuilder.Append(chunk);

                // 每收到一些内容就更新进度
                var estimatedProgress = Math.Min(90, 10 + (responseBuilder.Length / 100));
                if (estimatedProgress > lastProgressSent + 5)
                {
                    lastProgressSent = estimatedProgress;
                    await SendSseEvent("progress", new SseProgressData
                    {
                        Percentage = estimatedProgress,
                        Stage = "润色中",
                        Message = "正在生成润色内容..."
                    }, jsonOptions, cancellationToken);
                }

                // 发送原始内容片段
                await SendSseEvent("chunk", new { content = chunk }, jsonOptions, cancellationToken);
            }

            // 解析完整响应
            var fullResponse = responseBuilder.ToString();
            var result = JsonHelper.ParseAIResponse<PolishResponse>(fullResponse, _logger);

            if (result == null)
            {
                await SendSseEvent("error", new SseErrorData
                {
                    Message = "AI 响应解析失败",
                    Code = "PARSE_ERROR"
                }, jsonOptions, cancellationToken);
                return;
            }

            // 发送完成事件
            await SendSseEvent("progress", new SseProgressData
            {
                Percentage = 100,
                Stage = "完成",
                Message = "润色完成！"
            }, jsonOptions, cancellationToken);

            await SendSseEvent("complete", result, jsonOptions, cancellationToken);

            _logger.LogInformation("流式润色完成，修改项: {Count}", result.Changes.Count);
        }
        catch (Exception ex)
        {
            await HandleSseErrorAsync(ex, jsonOptions, cancellationToken);
        }
    }

    /// <summary>
    /// 职位匹配
    /// </summary>
    /// <param name="request">匹配请求</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>匹配结果</returns>
    [HttpPost("match")]
    [ProducesResponseType(typeof(MatchResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MatchResponse>> Match(
        [FromBody] MatchRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ResumeContent))
        {
            return BadRequest(new { message = "简历内容不能为空" });
        }

        if (string.IsNullOrWhiteSpace(request.JobDescription))
        {
            return BadRequest(new { message = "职位描述不能为空" });
        }

        _logger.LogInformation("收到职位匹配请求");
        var result = await _matcherService.MatchAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// 简历导入（文件解析）
    /// </summary>
    /// <param name="file">上传的文件</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>解析结果</returns>
    [HttpPost("import")]
    [ProducesResponseType(typeof(ImportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ImportResponse>> Import(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "请上传文件" });
        }

        // 限制文件大小为 10MB
        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new { message = "文件大小不能超过 10MB" });
        }

        _logger.LogInformation("收到简历导入请求: {FileName}", file.FileName);
        var result = await _parserService.ParseAsync(file, cancellationToken);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// 面试问题预测
    /// </summary>
    /// <param name="request">预测请求</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>预测结果</returns>
    [HttpPost("interview")]
    [ProducesResponseType(typeof(InterviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InterviewResponse>> Interview(
        [FromBody] InterviewRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ResumeContent))
        {
            return BadRequest(new { message = "简历内容不能为空" });
        }

        _logger.LogInformation("收到面试预测请求");
        var result = await _interviewService.PredictAsync(request, cancellationToken);
        return Ok(result);
    }
}
