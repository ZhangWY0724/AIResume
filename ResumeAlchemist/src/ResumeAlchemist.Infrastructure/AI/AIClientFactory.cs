using Microsoft.Extensions.DependencyInjection;
using ResumeAlchemist.Core.Interfaces;
using ResumeAlchemist.Shared.DTOs;

namespace ResumeAlchemist.Infrastructure.AI;

/// <summary>
/// AI 客户端工厂实现
/// </summary>
public class AIClientFactory : IAIClientFactory
{
    private readonly IServiceProvider _serviceProvider;

    public AIClientFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public IAIClient GetClient(AIModelType modelType)
    {
        return modelType switch
        {
            AIModelType.Gemini => _serviceProvider.GetRequiredService<GeminiAIClient>(),
            AIModelType.Kilo => _serviceProvider.GetRequiredService<KiloAIClient>(),
            AIModelType.Gpt54 => _serviceProvider.GetRequiredService<Gpt54AIClient>(),
            _ => _serviceProvider.GetRequiredService<KiloAIClient>()
        };
    }
}
