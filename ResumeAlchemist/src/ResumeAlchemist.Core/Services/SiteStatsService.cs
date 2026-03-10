using System.Collections.Concurrent;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Microsoft.Extensions.Logging;
using ResumeAlchemist.Core.Interfaces;

namespace ResumeAlchemist.Core.Services;

/// <summary>
/// 网站使用统计服务 — 基于 JSON 文件持久化
/// 线程安全，支持高并发计数，防抖写入避免频繁磁盘 I/O
/// </summary>
public class SiteStatsService : ISiteStatsService, IDisposable
{
    private readonly ConcurrentDictionary<string, long> _counters = new();
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private readonly ILogger<SiteStatsService> _logger;
    private readonly string _filePath;
    private readonly JsonSerializerOptions _jsonOptions;

    // 防抖写入：最后一次 Increment 后延迟 2 秒写入文件
    private CancellationTokenSource? _debounceCts;
    private readonly object _debounceLock = new();

    /// <summary>
    /// 支持的统计指标名称
    /// </summary>
    public static class Metrics
    {
        public const string ResumesUploaded = "resumesUploaded";
        public const string ResumesAnalyzed = "resumesAnalyzed";
        public const string ResumesPolished = "resumesPolished";
    }

    public SiteStatsService(ILogger<SiteStatsService> logger)
    {
        _logger = logger;

        // 数据文件存放在应用根目录的 data 文件夹下
        var dataDir = Path.Combine(AppContext.BaseDirectory, "data");
        Directory.CreateDirectory(dataDir);
        _filePath = Path.Combine(dataDir, "site_stats.json");

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
        };

        // 初始化默认指标
        _counters[Metrics.ResumesUploaded] = 0;
        _counters[Metrics.ResumesAnalyzed] = 0;
        _counters[Metrics.ResumesPolished] = 0;

        // 启动时从文件加载
        LoadFromFile();
    }

    /// <summary>
    /// 从 JSON 文件加载历史计数数据
    /// </summary>
    private void LoadFromFile()
    {
        try
        {
            if (!File.Exists(_filePath))
            {
                _logger.LogInformation("统计数据文件不存在，使用默认值: {Path}", _filePath);
                return;
            }

            var json = File.ReadAllText(_filePath);
            var data = JsonSerializer.Deserialize<Dictionary<string, long>>(json, _jsonOptions);

            if (data != null)
            {
                foreach (var kvp in data)
                {
                    _counters[kvp.Key] = kvp.Value;
                }

                _logger.LogInformation("已加载统计数据: {Stats}",
                    string.Join(", ", data.Select(x => $"{x.Key}={x.Value}")));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "加载统计数据文件失败，使用默认值");
        }
    }

    /// <summary>
    /// 将当前计数写入 JSON 文件
    /// </summary>
    private async Task SaveToFileAsync()
    {
        await _writeLock.WaitAsync();
        try
        {
            var snapshot = new Dictionary<string, long>(_counters);
            var json = JsonSerializer.Serialize(snapshot, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "保存统计数据文件失败");
        }
        finally
        {
            _writeLock.Release();
        }
    }

    /// <summary>
    /// 防抖触发保存：最后一次调用后延迟 2 秒再写入
    /// </summary>
    private void DebounceSave()
    {
        lock (_debounceLock)
        {
            _debounceCts?.Cancel();
            _debounceCts?.Dispose();
            _debounceCts = new CancellationTokenSource();
            var token = _debounceCts.Token;

            _ = Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(2000, token);
                    await SaveToFileAsync();
                }
                catch (TaskCanceledException)
                {
                    // 被新的写入请求取消，忽略
                }
            }, token);
        }
    }

    /// <inheritdoc />
    public Task IncrementAsync(string metricName)
    {
        _counters.AddOrUpdate(metricName, 1, (_, current) => current + 1);
        _logger.LogDebug("统计指标 {Metric} +1, 当前值: {Value}", metricName, _counters[metricName]);

        // 防抖写入文件
        DebounceSave();

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<Dictionary<string, long>> GetStatsAsync()
    {
        return Task.FromResult(new Dictionary<string, long>(_counters));
    }

    public void Dispose()
    {
        // 应用关闭时立即保存
        lock (_debounceLock)
        {
            _debounceCts?.Cancel();
            _debounceCts?.Dispose();
        }

        // 同步保存，确保数据不丢失
        _writeLock.Wait();
        try
        {
            var snapshot = new Dictionary<string, long>(_counters);
            var json = JsonSerializer.Serialize(snapshot, _jsonOptions);
            File.WriteAllText(_filePath, json);
            _logger.LogInformation("应用关闭，已保存统计数据");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "关闭时保存统计数据失败");
        }
        finally
        {
            _writeLock.Release();
        }

        _writeLock.Dispose();
    }
}
