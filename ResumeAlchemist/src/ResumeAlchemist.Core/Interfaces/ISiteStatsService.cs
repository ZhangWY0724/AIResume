namespace ResumeAlchemist.Core.Interfaces;

/// <summary>
/// 网站使用统计服务接口
/// </summary>
public interface ISiteStatsService
{
    /// <summary>
    /// 指定指标计数 +1
    /// </summary>
    /// <param name="metricName">指标名称，如 resumesUploaded、resumesAnalyzed、resumesPolished</param>
    Task IncrementAsync(string metricName);

    /// <summary>
    /// 获取所有统计数据
    /// </summary>
    /// <returns>指标名称与计数的字典</returns>
    Task<Dictionary<string, long>> GetStatsAsync();
}
