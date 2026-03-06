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
        services.AddOptions<GeminiAIOptions>()
            .Bind(configuration.GetSection(GeminiAIOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Kilo AI：保持可选（不 ValidateOnStart）
        services.AddOptions<KiloAIOptions>()
            .Bind(configuration.GetSection(KiloAIOptions.SectionName))
            .ValidateDataAnnotations();

        // GPT-5.4：保持可选（不 ValidateOnStart）
        services.AddOptions<Gpt54AIOptions>()
            .Bind(configuration.GetSection(Gpt54AIOptions.SectionName))
            .ValidateDataAnnotations();

        // 注册 AI 客户端工厂
        services.AddSingleton<IAIClientFactory, AIClientFactory>();

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

        // 配置 HttpClient for GPT-5.4（OpenAI 兼容）
        var gpt54Options = configuration.GetSection(Gpt54AIOptions.SectionName).Get<Gpt54AIOptions>() ?? new Gpt54AIOptions();
        services.AddHttpClient<Gpt54AIClient>(client =>
        {
            client.BaseAddress = new Uri(gpt54Options.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(gpt54Options.TimeoutSeconds);
        });
        services.AddScoped<IGpt54AIClient>(sp => sp.GetRequiredService<Gpt54AIClient>());

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
