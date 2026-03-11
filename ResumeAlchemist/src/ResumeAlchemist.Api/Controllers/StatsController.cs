using Microsoft.AspNetCore.Mvc;
using ResumeAlchemist.Core.Interfaces;

namespace ResumeAlchemist.Api.Controllers;

/// <summary>
/// 网站使用统计 API
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class StatsController : ControllerBase
{
    private readonly ISiteStatsService _statsService;

    public StatsController(ISiteStatsService statsService)
    {
        _statsService = statsService;
    }

    /// <summary>
    /// 获取网站使用统计数据
    /// </summary>
    /// <returns>各维度的统计计数</returns>
    [HttpGet]
    [ProducesResponseType(typeof(Dictionary<string, long>), StatusCodes.Status200OK)]
    public async Task<ActionResult<Dictionary<string, long>>> GetStats()
    {
        var stats = await _statsService.GetStatsAsync();
        return Ok(stats);
    }
}
