using Microsoft.AspNetCore.Mvc;
using ResumeAlchemist.Core.Interfaces;
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
