using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Infrastructure.AI;
using ResumeAlchemist.Infrastructure.Services;
using ResumeAlchemist.Shared.Options;

namespace ResumeAlchemist.Infrastructure;

/// <summary>
/// Infrastructure 层服务注册扩展方法
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 添加 Infrastructure 层服务（使用 Scrutor 自动扫描注册）
    /// </summary>
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 注册 Options 配置
        services.AddOptions<ZhipuAIOptions>()
            .Bind(configuration.GetSection(ZhipuAIOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<GeminiAIOptions>()
            .Bind(configuration.GetSection(GeminiAIOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Kilo AI：保持可选（不 ValidateOnStart），避免影响现有 Zhipu/Gemini 启动
        services.AddOptions<KiloAIOptions>()
            .Bind(configuration.GetSection(KiloAIOptions.SectionName))
            .ValidateDataAnnotations();

        // 注册 AI 客户端工厂
        services.AddSingleton<IAIClientFactory, AIClientFactory>();

        // 配置 HttpClient for 智谱 AI
        var zhipuOptions = configuration.GetSection(ZhipuAIOptions.SectionName).Get<ZhipuAIOptions>() ?? new ZhipuAIOptions();
        services.AddHttpClient<ZhipuAIClient>(client =>
        {
            client.BaseAddress = new Uri(zhipuOptions.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(zhipuOptions.TimeoutSeconds);
        });
        services.AddScoped<IZhipuAIClient>(sp => sp.GetRequiredService<ZhipuAIClient>());

        // 配置 HttpClient for Gemini AI
        var geminiOptions = configuration.GetSection(GeminiAIOptions.SectionName).Get<GeminiAIOptions>() ?? new GeminiAIOptions();
        services.AddHttpClient<GeminiAIClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(geminiOptions.TimeoutSeconds);
        });
        services.AddScoped<IGeminiAIClient>(sp => sp.GetRequiredService<GeminiAIClient>());

        // 配置 HttpClient for Kilo AI（OpenAI 兼容网关）
        var kiloOptions = configuration.GetSection(KiloAIOptions.SectionName).Get<KiloAIOptions>() ?? new KiloAIOptions();
        services.AddHttpClient<KiloAIClient>(client =>
        {
            client.BaseAddress = new Uri(kiloOptions.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(kiloOptions.TimeoutSeconds);
        });
        services.AddScoped<IKiloAIClient>(sp => sp.GetRequiredService<KiloAIClient>());

        // 自动扫描并注册 Services 目录下的所有服务
        services.Scan(scan => scan
            .FromAssemblyOf<ResumeParserService>()
            .AddClasses(classes => classes
                .InNamespaces("ResumeAlchemist.Infrastructure.Services"))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        return services;
    }
}
