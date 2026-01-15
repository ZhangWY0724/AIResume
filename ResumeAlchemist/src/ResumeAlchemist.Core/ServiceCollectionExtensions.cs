using Microsoft.Extensions.DependencyInjection;
using ResumeAlchemist.Core.Services;

namespace ResumeAlchemist.Core;

/// <summary>
/// Core 层服务注册扩展方法
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 添加 Core 层业务服务（使用 Scrutor 自动扫描注册）
    /// </summary>
    public static IServiceCollection AddCoreServices(this IServiceCollection services)
    {
        // 自动扫描并注册所有以 Service 结尾的类（排除 PdfExportService，它需要单例）
        services.Scan(scan => scan
            .FromAssemblyOf<ResumeAnalyzerService>()
            .AddClasses(classes => classes
                .Where(t => t.Name.EndsWith("Service") && t.Name != "PdfExportService"))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        // PdfExportService 注册为单例（无状态，可复用）
        services.Scan(scan => scan
            .FromAssemblyOf<PdfExportService>()
            .AddClasses(classes => classes.Where(t => t.Name == "PdfExportService"))
            .AsImplementedInterfaces()
            .WithSingletonLifetime());

        return services;
    }
}
